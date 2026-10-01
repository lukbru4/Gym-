// Freunde & Community (nur Cloud). Alle Abfragen laufen über Server-Funktionen in supabase/schema.sql,
// die selbst prüfen, wer was sehen darf.
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicUrl } from '../lib/platform';
import type { Equipped } from '../lib/shop';
import type { CustomPalette } from '../lib/theme';
import type { Exercise, ISODate, Workout, WorkoutSet } from '../lib/types';

export type Visibility = 'friends' | 'private';
export interface Profile { id: string; display_name: string; friend_code: string; visibility: Visibility }
export type FriendStatus = 'friend' | 'incoming' | 'outgoing';
export interface Friend { user_id: string; display_name: string; status: FriendStatus; since: string }
export type RequestResult = 'requested' | 'accepted' | 'already' | 'self' | 'not_found';
export interface FeedItem {
  workout_id: number;
  user_id: string;
  display_name: string;
  date: ISODate;
  created_at: string;
  sets: number;
  volume: number;
  exercises: string[] | null;
  likes: number;
  liked: boolean;
  comments: number;
}
export interface LeaderRow { user_id: string; display_name: string; is_me: boolean; credits: number; week_workouts: number; total_workouts: number }
export interface WeekRow { user_id: string; display_name: string; is_me: boolean; workouts: number; sets: number; volume: number }
export interface ExerciseRow { user_id: string; display_name: string; is_me: boolean; best_e1rm: number; weight_kg: number; reps: number; date: ISODate }
export type ChallengeMetric = 'workouts' | 'sets' | 'volume';
export type ChallengeState = 'incoming' | 'outgoing' | 'running' | 'won' | 'lost' | 'tie';
export interface Challenge {
  id: number;
  other_id: string;
  other_name: string;
  metric: ChallengeMetric;
  state: ChallengeState;
  start_date: ISODate | null;
  end_date: ISODate | null;
  my_score: number;
  their_score: number;
  bonus: number;
}
export interface Comment { id: number; user_id: string; display_name: string; body: string; created_at: string; is_mine: boolean; can_delete: boolean }
export interface FriendProfileData { profile: { id: string; display_name: string; equipped?: Equipped }; workouts: Workout[]; sets: WorkoutSet[]; exercises: Exercise[] }

export interface Social {
  myProfile(): Promise<Profile>;
  updateProfile(displayName: string, visibility: Visibility): Promise<void>;
  sendRequest(code: string): Promise<RequestResult>;
  respond(userId: string, accept: boolean): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  friends(): Promise<Friend[]>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  blocks(): Promise<{ user_id: string; display_name: string }[]>;
  report(userId: string, reason: string): Promise<void>;
  feed(before?: string | null): Promise<FeedItem[]>;
  toggleLike(workoutId: number): Promise<boolean>;
  leaderboard(): Promise<LeaderRow[]>;
  weekBoard(): Promise<WeekRow[]>;
  exerciseList(): Promise<{ name: string; people: number }[]>;
  exerciseBoard(exercise: string): Promise<ExerciseRow[]>;
  friendProfile(userId: string): Promise<FriendProfileData>;
  challenges(): Promise<Challenge[]>;
  createChallenge(opponent: string, metric: ChallengeMetric): Promise<number>;
  respondChallenge(id: number, accept: boolean): Promise<void>;
  cancelChallenge(id: number): Promise<void>;
  challengeBonus(): Promise<number>;
  comments(workoutId: number): Promise<Comment[]>;
  addComment(workoutId: number, body: string): Promise<number>;
  deleteComment(id: number): Promise<void>;
  reportComment(id: number, reason: string): Promise<void>;
  workoutSocial(workoutId: number): Promise<{ likes: number; comments: number } | null>;
  wallet(): Promise<{ earned: number; spent: number; balance: number }>;
  myShop(): Promise<{ owned: string[]; equipped: Equipped; admin?: boolean }>;
  buy(itemId: string): Promise<number>;
  equip(kind: 'skin' | 'accessory' | 'title', itemId: string | null): Promise<void>;
  catalog(): Promise<CatalogRow[]>;
  adminSaveScheme(id: string, name: string, price: number, palette: CustomPalette): Promise<void>;
  adminHideScheme(id: string): Promise<void>;
  adminReports(): Promise<AdminReport[]>;
  adminResolveReport(id: number, deleteComment: boolean): Promise<void>;
  schemaVersion(): Promise<number>;
}

export interface CatalogRow { id: string; kind: string; name: string; price: number; palette: CustomPalette | null }
export interface AdminReport {
  id: number;
  created_at: string;
  reason: string;
  reporter_name: string;
  reported: string;
  reported_name: string;
  comment_id: number | null;
  comment_body: string | null;
}

export function createSocial(supabase: SupabaseClient): Social {
  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw error;
    return data as T;
  }
  return {
    myProfile: async () => (await rpc<Profile[]>('my_profile'))[0],
    updateProfile: (p_display_name, p_visibility) => rpc('update_my_profile', { p_display_name, p_visibility }),
    sendRequest: (p_code) => rpc('send_friend_request', { p_code }),
    respond: (p_user, p_accept) => rpc('respond_friend_request', { p_user, p_accept }),
    removeFriend: (p_user) => rpc('remove_friend', { p_user }),
    friends: () => rpc('my_friends'),
    block: (p_user) => rpc('block_user', { p_user }),
    unblock: (p_user) => rpc('unblock_user', { p_user }),
    blocks: () => rpc('my_blocks'),
    report: (p_user, p_reason) => rpc('report_user', { p_user, p_reason }),
    feed: (p_before = null) => rpc('friend_feed', { p_limit: 30, p_before }),
    toggleLike: (p_workout) => rpc('toggle_like', { p_workout }),
    leaderboard: () => rpc('friend_leaderboard'),
    weekBoard: () => rpc('friend_week_board'),
    exerciseList: () => rpc('friend_exercise_list'),
    exerciseBoard: (p_exercise) => rpc('friend_exercise_board', { p_exercise }),
    friendProfile: (p_user) => rpc('friend_profile', { p_user }),
    challenges: () => rpc('my_challenges'),
    createChallenge: (p_opponent, p_metric) => rpc('create_challenge', { p_opponent, p_metric }),
    respondChallenge: (p_id, p_accept) => rpc('respond_challenge', { p_id, p_accept }),
    cancelChallenge: (p_id) => rpc('cancel_challenge', { p_id }),
    challengeBonus: () => rpc('my_challenge_bonus'),
    comments: (p_workout) => rpc('workout_comments', { p_workout }),
    addComment: (p_workout, p_body) => rpc('add_comment', { p_workout, p_body }),
    deleteComment: (p_id) => rpc('delete_comment', { p_id }),
    reportComment: (p_id, p_reason) => rpc('report_comment', { p_id, p_reason }),
    wallet: async () => (await rpc<{ earned: number; spent: number; balance: number }[]>('my_wallet'))[0] ?? { earned: 0, spent: 0, balance: 0 },
    myShop: () => rpc('my_shop'),
    buy: (p_item) => rpc('buy_item', { p_item }),
    equip: (p_kind, p_item) => rpc('equip_item', { p_kind, p_item }),
    catalog: () => rpc('shop_catalog'),
    adminSaveScheme: (p_id, p_name, p_price, p_palette) => rpc('admin_save_scheme', { p_id, p_name, p_price, p_palette }),
    adminHideScheme: (p_id) => rpc('admin_hide_scheme', { p_id }),
    adminReports: () => rpc('admin_reports'),
    adminResolveReport: (p_id, p_delete_comment) => rpc('admin_resolve_report', { p_id, p_delete_comment }),
    schemaVersion: async () => Number(await rpc('schema_version')) || 0,
    workoutSocial: async (p_workout) => (await rpc<{ likes: number; comments: number }[]>('workout_social', { p_workout }))[0] ?? null,
  };
}

/** Text für das Ergebnis einer Freundschaftsanfrage */
export function requestMessage(r: RequestResult): string {
  return {
    requested: 'Anfrage gesendet. Sobald sie angenommen ist, seid ihr Freunde.',
    accepted: 'Ihr seid jetzt Freunde!',
    already: 'Ihr seid schon befreundet oder die Anfrage läuft bereits.',
    self: 'Das ist dein eigener Code.',
    not_found: 'Kein Profil mit diesem Code gefunden.',
  }[r];
}

/** Einladungslink, der direkt die Anfrage öffnet */
export const inviteLink = (code: string) => `${publicUrl()}#/freunde/add/${code}`;
