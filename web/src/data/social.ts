// Freunde & Community (nur Cloud). Alle Abfragen laufen über Server-Funktionen in supabase/schema.sql,
// die selbst prüfen, wer was sehen darf.
import type { SupabaseClient } from '@supabase/supabase-js';
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
}
export interface LeaderRow { user_id: string; display_name: string; is_me: boolean; credits: number; week_workouts: number; total_workouts: number }
export interface FriendProfileData { profile: { id: string; display_name: string }; workouts: Workout[]; sets: WorkoutSet[]; exercises: Exercise[] }

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
  friendProfile(userId: string): Promise<FriendProfileData>;
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
    friendProfile: (p_user) => rpc('friend_profile', { p_user }),
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
export const inviteLink = (code: string) => `${location.origin}${location.pathname}#/freunde/add/${code}`;
