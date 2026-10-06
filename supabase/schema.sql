-- Gym Tracker – Datenbankschema für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" komplett ausführen.

-- ---------------------------------------------------------------------------
-- Übungen: user_id NULL = vorgegebene Übung (für alle sichtbar),
-- sonst eigene Übung eines Nutzers.
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete cascade default auth.uid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  type        text not null check (type in ('strength', 'cardio')),
  muscles     text[] not null default '{}',
  created_at  timestamptz not null default now()
);
-- für bestehende Installationen
alter table public.exercises add column if not exists muscles text[] not null default '{}';

create unique index if not exists exercises_unique_name
  on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ---------------------------------------------------------------------------
-- Trainings
-- ---------------------------------------------------------------------------
create table if not exists public.workouts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date        date not null default current_date,
  notes       text check (length(notes) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists workouts_user_date on public.workouts (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Sätze: Kraft (reps + weight_kg) oder Cardio (duration_min + distance_km)
-- ---------------------------------------------------------------------------
create table if not exists public.sets (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  workout_id    bigint not null references public.workouts (id) on delete cascade,
  exercise_id   bigint not null references public.exercises (id) on delete restrict,
  position      int not null default 0,
  reps          int check (reps >= 0 and reps <= 1000),
  weight_kg     numeric(6, 2) check (weight_kg >= 0 and weight_kg <= 1000),
  duration_min  numeric(6, 2) check (duration_min >= 0 and duration_min <= 1440),
  distance_km   numeric(7, 3) check (distance_km >= 0 and distance_km <= 1000),
  is_warmup     boolean not null default false
);
alter table public.sets add column if not exists is_warmup boolean not null default false;
-- Einseitige Übungen (einarmig/einbeinig): L = links, R = rechts, leer = beidseitig
alter table public.sets add column if not exists side text check (side in ('L', 'R'));

create index if not exists sets_workout on public.sets (workout_id);
create index if not exists sets_user_exercise on public.sets (user_id, exercise_id);

-- ---------------------------------------------------------------------------
-- Körpergewicht (ein Eintrag pro Tag)
-- ---------------------------------------------------------------------------
create table if not exists public.body_weights (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date        date not null default current_date,
  weight_kg   numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 500),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Workout-Vorlagen (z. B. "Push", "Pull")
-- exercises: [{ exercise_id, rest_seconds, sets: [{ warmup, weight_kg, reps }] }]
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name        text not null check (length(trim(name)) between 1 and 80),
  exercises   jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: jeder sieht und ändert nur seine eigenen Daten
-- ---------------------------------------------------------------------------
alter table public.exercises    enable row level security;
alter table public.workouts     enable row level security;
alter table public.sets         enable row level security;
alter table public.body_weights enable row level security;
alter table public.templates    enable row level security;

-- Zugriff für angemeldete Nutzer ausdrücklich erlauben (welche Zeilen, regeln die Policies unten).
-- Nötig, falls beim Anlegen des Projekts „neue Tabellen automatisch freigeben“ ausgeschaltet wurde.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.exercises, public.workouts, public.sets,
  public.body_weights, public.templates to authenticated;

drop policy if exists "exercises read"   on public.exercises;
drop policy if exists "exercises insert" on public.exercises;
drop policy if exists "exercises update" on public.exercises;
drop policy if exists "exercises delete" on public.exercises;
create policy "exercises read"   on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises insert" on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercises update" on public.exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises delete" on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "workouts own" on public.workouts;
create policy "workouts own" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "sets own" on public.sets;
create policy "sets own" on public.sets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
    and exists (select 1 from public.exercises e where e.id = exercise_id
                and (e.user_id is null or e.user_id = (select auth.uid())))
  );

drop policy if exists "templates own" on public.templates;
create policy "templates own" on public.templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "body_weights own" on public.body_weights;
create policy "body_weights own" on public.body_weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Vorgegebene Übungen
-- ---------------------------------------------------------------------------
insert into public.exercises (user_id, name, type, muscles) values
  (null, 'Bankdrücken', 'strength', '{brust}'),
  (null, 'Schrägbankdrücken', 'strength', '{brust}'),
  (null, 'Kurzhantel-Bankdrücken', 'strength', '{brust}'),
  (null, 'Butterfly', 'strength', '{brust}'),
  (null, 'Dips', 'strength', '{trizeps,brust}'),
  (null, 'Kniebeuge', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse', 'strength', '{quadrizeps}'),
  (null, 'Ausfallschritte', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinstrecker', 'strength', '{quadrizeps}'),
  (null, 'Beinbeuger', 'strength', '{beinbeuger}'),
  (null, 'Wadenheben', 'strength', '{waden}'),
  (null, 'Kreuzheben', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rumänisches Kreuzheben', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Klimmzüge', 'strength', '{lat}'),
  (null, 'Latziehen', 'strength', '{lat}'),
  (null, 'Langhantelrudern', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Kabelrudern', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterdrücken', 'strength', '{schultern}'),
  (null, 'Seitheben', 'strength', '{schultern}'),
  (null, 'Face Pulls', 'strength', '{schultern}'),
  (null, 'Bizepscurls', 'strength', '{bizeps}'),
  (null, 'Hammercurls', 'strength', '{bizeps}'),
  (null, 'Trizepsdrücken am Kabel', 'strength', '{trizeps}'),
  (null, 'French Press', 'strength', '{trizeps}'),
  (null, 'Crunches', 'strength', '{bauch}'),
  (null, 'Plank', 'strength', '{bauch}'),
  (null, 'Laufband', 'cardio', '{}'),
  (null, 'Crosstrainer', 'cardio', '{}'),
  (null, 'Fahrradergometer', 'cardio', '{}'),
  (null, 'Rudergerät', 'cardio', '{}'),
  (null, 'Stepper', 'cardio', '{}'),
  (null, 'Laufen (draußen)', 'cardio', '{}')
on conflict (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  do update set muscles = excluded.muscles;

-- ---------------------------------------------------------------------------
-- Konto löschen (Apple verlangt, dass Nutzer ihr Konto in der App löschen können).
-- Löscht den Auth-Nutzer; alle Daten hängen per "on delete cascade" daran.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Credits serverseitig berechnen – gleiche Regeln wie web/src/lib/xp.ts und web/src/lib/quests.ts:
--   Training: +20 pro Training mit mindestens einem Arbeitssatz, +2 pro Arbeitssatz,
--             +10 wenn eine Kraftübung stärker ist als beim letzten Mal (geschätztes 1RM, Epley),
--             +25 zusätzlich bei neuem Rekord der Übung. Aufwärmsätze zählen nicht.
--   Tägliche Aufgaben (pro Kalendertag): trainiert +25, ≥ 10 Arbeitssätze +15, ≥ 1 Rekord +30.
--   Wöchentliche Aufgaben (Woche ab Montag): an ≥ 3 Tagen trainiert +75, ≥ 3 Steigerungen +60.
-- Grundlage für den Shop: Käufe prüfen später gegen diesen Wert, nicht gegen die App.
-- ---------------------------------------------------------------------------
create or replace function public.credits_earned(p_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  e record;
  total integer := 0;
  n_sets integer;
  n_impr integer;
  n_rec integer;
  st jsonb := '{}'::jsonb;   -- exercise_id -> {"last": 1RM, "best": 1RM}
  prev jsonb;
  days jsonb := '{}'::jsonb; -- 'YYYY-MM-DD' -> {"sets", "records"}
  weeks jsonb := '{}'::jsonb; -- Montag -> {"days": {datum: true}, "improvements"}
  dkey text;
  wkey text;
  d jsonb;
  k text;
begin
  for w in
    select id, date from public.workouts where user_id = p_user order by date, id
  loop
    select count(*) into n_sets from public.sets s
      where s.workout_id = w.id and not s.is_warmup;
    if n_sets > 0 then
      total := total + 20 + 2 * n_sets;
    end if;
    n_impr := 0;
    n_rec := 0;
    for e in
      select s.exercise_id, x.type,
             max(case
                   when coalesce(s.weight_kg, 0) = 0 or coalesce(s.reps, 0) = 0 then 0
                   when s.reps = 1 then s.weight_kg::double precision
                   else s.weight_kg::double precision * (1 + s.reps::double precision / 30)
                 end) as best
        from public.sets s
        join public.exercises x on x.id = s.exercise_id
       where s.workout_id = w.id and not s.is_warmup
       group by s.exercise_id, x.type
    loop
      prev := st -> e.exercise_id::text;
      if e.type <> 'cardio' and prev is not null then
        if e.best > (prev ->> 'last')::double precision + 1e-9 then
          total := total + 10;
          n_impr := n_impr + 1;
        end if;
        if e.best > (prev ->> 'best')::double precision + 1e-9 then
          total := total + 25;
          n_rec := n_rec + 1;
        end if;
      end if;
      st := st || jsonb_build_object(e.exercise_id::text, jsonb_build_object(
        'last', case when e.type = 'cardio' then 0 else e.best end,
        'best', greatest(coalesce((prev ->> 'best')::double precision, 0),
                         case when e.type = 'cardio' then 0 else e.best end)));
    end loop;

    -- Aufgaben: Tag und Woche fortschreiben
    dkey := w.date::text;
    d := coalesce(days -> dkey, '{"sets": 0, "records": 0}'::jsonb);
    days := days || jsonb_build_object(dkey, jsonb_build_object(
      'sets', (d ->> 'sets')::int + n_sets, 'records', (d ->> 'records')::int + n_rec));
    wkey := date_trunc('week', w.date)::date::text;
    d := coalesce(weeks -> wkey, '{"days": {}, "improvements": 0}'::jsonb);
    if n_sets > 0 then
      d := jsonb_set(d, array['days', dkey], 'true'::jsonb);
    end if;
    d := jsonb_set(d, '{improvements}', to_jsonb((d ->> 'improvements')::int + n_impr));
    weeks := weeks || jsonb_build_object(wkey, d);
  end loop;

  for k in select jsonb_object_keys(days) loop
    d := days -> k;
    if (d ->> 'sets')::int > 0 then total := total + 25; end if;
    if (d ->> 'sets')::int >= 10 then total := total + 15; end if;
    if (d ->> 'records')::int >= 1 then total := total + 30; end if;
  end loop;
  for k in select jsonb_object_keys(weeks) loop
    d := weeks -> k;
    if (select count(*) from jsonb_object_keys(d -> 'days')) >= 3 then total := total + 75; end if;
    if (d ->> 'improvements')::int >= 3 then total := total + 60; end if;
  end loop;
  return total;
end;
$$;
revoke all on function public.credits_earned(uuid) from public;

-- Für die App: eigene Credits abfragen (nur für den angemeldeten Nutzer)
create or replace function public.my_credits()
returns integer
language sql
stable
security definer
set search_path = ''
as $$ select public.credits_earned(auth.uid()) $$;
revoke all on function public.my_credits() from public;
grant execute on function public.my_credits() to authenticated;

-- ===========================================================================
-- Phase 3: Freunde & Community
-- Alles Soziale läuft über Funktionen mit „security definer“, die selbst prüfen,
-- wer was sehen darf. Die Tabellen der Trainings bleiben „nur eigene Daten“.
-- ===========================================================================

-- Profil: Anzeigename, Freundescode (zum Teilen), Sichtbarkeit für Freunde
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 30),
  friend_code   text not null unique check (friend_code ~ '^[A-Z2-9]{8}$'),
  visibility    text not null default 'friends' check (visibility in ('friends', 'private')),
  created_at    timestamptz not null default now()
);

-- Freundschaften: Anfrage von requester an addressee; nach Annahme status = 'accepted'
create table if not exists public.friendships (
  requester   uuid not null references auth.users (id) on delete cascade,
  addressee   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee on public.friendships (addressee);

-- Blockieren (Apple-Pflicht bei Nutzerinhalten): beendet Freundschaft, verhindert neue Anfragen
create table if not exists public.blocks (
  blocker     uuid not null references auth.users (id) on delete cascade,
  blocked     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- Meldungen (Apple-Pflicht): werden im Supabase-Dashboard geprüft
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  reporter    uuid not null references auth.users (id) on delete cascade,
  reported    uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at  timestamptz not null default now()
);

-- „Anfeuern“ (Like) für ein Training
create table if not exists public.likes (
  workout_id  bigint not null references public.workouts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (workout_id, user_id)
);

-- Kommentare unter Trainings (kurz, gefiltert, meldbar, löschbar)
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  workout_id  bigint not null references public.workouts (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  created_at  timestamptz not null default now()
);
create index if not exists comments_workout on public.comments (workout_id, created_at);

-- Meldungen können sich auf einen Kommentar beziehen
alter table public.reports add column if not exists comment_id bigint references public.comments (id) on delete set null;

-- Kein direkter Zugriff auf diese Tabellen – nur über die Funktionen unten.
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks      enable row level security;
alter table public.reports     enable row level security;
alter table public.likes       enable row level security;
alter table public.comments    enable row level security;
revoke all on public.profiles, public.friendships, public.blocks, public.reports, public.likes, public.comments from anon, authenticated;

-- ---- Hilfsfunktionen -------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  )
$$;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks k
    where (k.blocker = a and k.blocked = b) or (k.blocker = b and k.blocked = a)
  )
$$;

-- Darf viewer die Trainings von owner sehen? (selbst, oder Freund mit Sichtbarkeit „friends“, nicht blockiert)
create or replace function public.can_see(viewer uuid, owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select viewer = owner or (
    public.are_friends(viewer, owner)
    and not public.is_blocked(viewer, owner)
    and coalesce((select p.visibility from public.profiles p where p.id = owner), 'friends') = 'friends'
  )
$$;

revoke all on function public.are_friends(uuid, uuid), public.is_blocked(uuid, uuid), public.can_see(uuid, uuid) from public;

-- Zufälliger Freundescode aus 8 gut lesbaren Zeichen (ohne 0/O/1/I)
create or replace function public.new_friend_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function public.new_friend_code() from public;

-- ---- Eigenes Profil ----------------------------------------------------------
-- Legt das Profil beim ersten Aufruf an (Name = Anfang der E-Mail-Adresse).
create or replace function public.my_profile()
returns table (id uuid, display_name text, friend_code text, visibility text)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'nicht angemeldet'; end if;
  insert into public.profiles (id, display_name, friend_code)
  select me,
         left(coalesce(nullif(btrim(split_part(u.email, '@', 1)), ''), 'Sportler'), 30),
         public.new_friend_code()
  from auth.users u where u.id = me
  on conflict on constraint profiles_pkey do nothing;
  return query select p.id, p.display_name, p.friend_code, p.visibility from public.profiles p where p.id = me;
end;
$$;

create or replace function public.update_my_profile(p_display_name text, p_visibility text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  perform public.my_profile();
  update public.profiles
     set display_name = left(btrim(p_display_name), 30),
         visibility = p_visibility
   where id = auth.uid();
end;
$$;

-- ---- Freundschaften ----------------------------------------------------------
-- Antwort: 'requested' | 'accepted' (Gegenanfrage lag schon vor) | 'already' | 'self' | 'not_found'
create or replace function public.send_friend_request(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  other uuid;
  existing public.friendships;
begin
  if me is null then raise exception 'nicht angemeldet'; end if;
  perform public.my_profile();
  select p.id into other from public.profiles p where p.friend_code = upper(btrim(p_code));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  if public.is_blocked(me, other) then return 'not_found'; end if; -- verrät nicht, dass blockiert wurde
  select * into existing from public.friendships f
   where (f.requester = me and f.addressee = other) or (f.requester = other and f.addressee = me);
  if found then
    if existing.status = 'accepted' or existing.requester = me then return 'already'; end if;
    update public.friendships set status = 'accepted' where requester = other and addressee = me;
    return 'accepted';
  end if;
  insert into public.friendships (requester, addressee) values (me, other);
  return 'requested';
end;
$$;

create or replace function public.respond_friend_request(p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  if p_accept then
    update public.friendships set status = 'accepted'
     where requester = p_user and addressee = auth.uid() and status = 'pending';
  else
    delete from public.friendships where requester = p_user and addressee = auth.uid() and status = 'pending';
  end if;
end;
$$;

-- Entfernt Freund oder zieht eigene Anfrage zurück
create or replace function public.remove_friend(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.friendships
   where (requester = auth.uid() and addressee = p_user) or (requester = p_user and addressee = auth.uid())
$$;

-- Freunde und offene Anfragen. status: 'friend' | 'incoming' | 'outgoing'
create or replace function public.my_friends()
returns table (user_id uuid, display_name text, status text, since timestamptz)
language sql stable security definer set search_path = '' as $$
  select other, coalesce(p.display_name, 'Unbekannt'),
         case when f.status = 'accepted' then 'friend'
              when f.addressee = auth.uid() then 'incoming' else 'outgoing' end,
         f.created_at
  from public.friendships f
  cross join lateral (select case when f.requester = auth.uid() then f.addressee else f.requester end as other) o
  left join public.profiles p on p.id = o.other
  where (f.requester = auth.uid() or f.addressee = auth.uid())
    and not public.is_blocked(auth.uid(), o.other)
  order by 3, 2
$$;

-- ---- Blockieren & Melden -----------------------------------------------------
create or replace function public.block_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_user = auth.uid() then raise exception 'ungültig'; end if;
  insert into public.blocks (blocker, blocked) values (auth.uid(), p_user) on conflict do nothing;
  perform public.remove_friend(p_user);
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker = auth.uid() and blocked = p_user
$$;

create or replace function public.my_blocks()
returns table (user_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select k.blocked, coalesce(p.display_name, 'Unbekannt')
  from public.blocks k left join public.profiles p on p.id = k.blocked
  where k.blocker = auth.uid()
  order by 2
$$;

create or replace function public.report_user(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_user = auth.uid() then raise exception 'ungültig'; end if;
  insert into public.reports (reporter, reported, reason) values (auth.uid(), p_user, left(btrim(p_reason), 500));
end;
$$;

-- ---- Feed, Anfeuern, Rangliste, Profil eines Freundes ----------------------------
-- Trainings der Freunde (neueste zuerst), mit Kennzahlen und Anfeuerungen
drop function if exists public.friend_feed(integer, timestamptz);
create function public.friend_feed(p_limit integer default 30, p_before timestamptz default null)
returns table (
  workout_id bigint, user_id uuid, display_name text, date date, created_at timestamptz,
  sets integer, volume numeric, exercises text[], likes integer, liked boolean, comments integer
)
language sql stable security definer set search_path = '' as $$
  select w.id, w.user_id, p.display_name, w.date, w.created_at,
         (select count(*)::int from public.sets s where s.workout_id = w.id and not s.is_warmup),
         (select coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0) from public.sets s
           where s.workout_id = w.id and not s.is_warmup),
         (select array_agg(distinct e.name order by e.name) from public.sets s join public.exercises e on e.id = s.exercise_id
           where s.workout_id = w.id),
         (select count(*)::int from public.likes l where l.workout_id = w.id),
         exists (select 1 from public.likes l where l.workout_id = w.id and l.user_id = auth.uid()),
         (select count(*)::int from public.comments c
           where c.workout_id = w.id and not public.is_blocked(auth.uid(), c.user_id))
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  where w.user_id <> auth.uid()
    and public.can_see(auth.uid(), w.user_id)
    and (p_before is null or w.created_at < p_before)
  order by w.created_at desc
  limit least(greatest(p_limit, 1), 100)
$$;

-- Anfeuern an/aus; liefert den neuen Zustand
create or replace function public.toggle_like(p_workout bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = p_workout;
  if owner is null or auth.uid() is null or not public.can_see(auth.uid(), owner) then
    raise exception 'Training nicht gefunden';
  end if;
  if exists (select 1 from public.likes where workout_id = p_workout and user_id = auth.uid()) then
    delete from public.likes where workout_id = p_workout and user_id = auth.uid();
    return false;
  end if;
  insert into public.likes (workout_id, user_id) values (p_workout, auth.uid());
  return true;
end;
$$;

-- Rangliste: du + sichtbare Freunde. Credits werden auf dem Server berechnet (nicht fälschbar).
create or replace function public.friend_leaderboard()
returns table (user_id uuid, display_name text, is_me boolean, credits integer, week_workouts integer, total_workouts integer)
language sql stable security definer set search_path = '' as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester = auth.uid() then f.addressee else f.requester end
    from public.friendships f
    where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
  )
  select x.id, coalesce(p.display_name, 'Du'), x.id = auth.uid(),
         public.credits_earned(x.id),
         (select count(*)::int from public.workouts w
           where w.user_id = x.id and w.date >= date_trunc('week', current_date)::date),
         (select count(*)::int from public.workouts w where w.user_id = x.id)
  from people x
  left join public.profiles p on p.id = x.id
  where auth.uid() is not null and public.can_see(auth.uid(), x.id)
  order by 4 desc, 2
$$;

-- Daten eines Freundes für sein Profil (Level, Serie, Körpergraph, Rekorde werden in der App berechnet)
create or replace function public.friend_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_see(auth.uid(), p_user) then
    raise exception 'Profil nicht sichtbar';
  end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('id', p.id, 'display_name', p.display_name) from public.profiles p where p.id = p_user),
    'workouts', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'date', w.date)) from public.workouts w where w.user_id = p_user), '[]'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_object(
              'workout_id', s.workout_id, 'exercise_id', s.exercise_id, 'position', s.position, 'reps', s.reps,
              'weight_kg', s.weight_kg, 'duration_min', s.duration_min, 'distance_km', s.distance_km, 'is_warmup', s.is_warmup, 'side', s.side))
            from public.sets s where s.user_id = p_user), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'type', e.type, 'user_id', e.user_id, 'muscles', e.muscles))
            from public.exercises e where e.id in (select s.exercise_id from public.sets s where s.user_id = p_user)), '[]'::jsonb)
  );
end;
$$;

-- Nur angemeldete Nutzer dürfen diese Funktionen aufrufen
revoke all on function
  public.my_profile(), public.update_my_profile(text, text), public.send_friend_request(text),
  public.respond_friend_request(uuid, boolean), public.remove_friend(uuid), public.my_friends(),
  public.block_user(uuid), public.unblock_user(uuid), public.my_blocks(), public.report_user(uuid, text),
  public.friend_feed(integer, timestamptz), public.toggle_like(bigint), public.friend_leaderboard(),
  public.friend_profile(uuid)
from public;
grant execute on function
  public.my_profile(), public.update_my_profile(text, text), public.send_friend_request(text),
  public.respond_friend_request(uuid, boolean), public.remove_friend(uuid), public.my_friends(),
  public.block_user(uuid), public.unblock_user(uuid), public.my_blocks(), public.report_user(uuid, text),
  public.friend_feed(integer, timestamptz), public.toggle_like(bigint), public.friend_leaderboard(),
  public.friend_profile(uuid)
to authenticated;

-- ---- Ranglisten pro Woche und pro Übung ----------------------------------------
-- Personen in der Rangliste: du + Freunde, deren Trainings du sehen darfst
create or replace function public.board_people()
returns table (id uuid)
language sql stable security definer set search_path = '' as $$
  select auth.uid() where auth.uid() is not null
  union
  select case when f.requester = auth.uid() then f.addressee else f.requester end
  from public.friendships f
  where f.status = 'accepted' and (f.requester = auth.uid() or f.addressee = auth.uid())
    and public.can_see(auth.uid(), case when f.requester = auth.uid() then f.addressee else f.requester end)
$$;
revoke all on function public.board_people() from public;

-- Diese Woche (ab Montag): Trainings, Arbeitssätze, Volumen
create or replace function public.friend_week_board()
returns table (user_id uuid, display_name text, is_me boolean, workouts integer, sets integer, volume numeric)
language sql stable security definer set search_path = '' as $$
  select x.id, coalesce(p.display_name, 'Du'), x.id = auth.uid(),
         (select count(*)::int from public.workouts w
           where w.user_id = x.id and w.date >= date_trunc('week', current_date)::date),
         (select count(*)::int from public.sets s join public.workouts w on w.id = s.workout_id
           where w.user_id = x.id and not s.is_warmup and w.date >= date_trunc('week', current_date)::date),
         (select coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0) from public.sets s join public.workouts w on w.id = s.workout_id
           where w.user_id = x.id and not s.is_warmup and w.date >= date_trunc('week', current_date)::date)
  from public.board_people() x
  left join public.profiles p on p.id = x.id
  order by 4 desc, 5 desc, 6 desc, 2
$$;

-- Kraftübungen, die du oder deine Freunde gemacht haben (für die Auswahl), mit Anzahl Personen
create or replace function public.friend_exercise_list()
returns table (name text, people integer)
language sql stable security definer set search_path = '' as $$
  select min(e.name), count(distinct s.user_id)::int
  from public.sets s
  join public.exercises e on e.id = s.exercise_id
  where e.type = 'strength' and not s.is_warmup and coalesce(s.reps, 0) > 0 and coalesce(s.weight_kg, 0) > 0
    and s.user_id in (select id from public.board_people())
  group by lower(e.name)
  order by 2 desc, 1
$$;

-- Bestwert pro Person für eine Übung (Name, Groß-/Kleinschreibung egal): geschätztes 1RM nach Epley
create or replace function public.friend_exercise_board(p_exercise text)
returns table (user_id uuid, display_name text, is_me boolean, best_e1rm numeric, weight_kg numeric, reps integer, date date)
language sql stable security definer set search_path = '' as $$
  select * from (
    select distinct on (x.id)
           x.id, coalesce(p.display_name, 'Du'), x.id = auth.uid(),
           round(case when s.reps = 1 then s.weight_kg else s.weight_kg * (1 + s.reps / 30.0) end, 1) as best,
           s.weight_kg, s.reps, w.date
    from public.board_people() x
    join public.sets s on s.user_id = x.id
    join public.workouts w on w.id = s.workout_id
    join public.exercises e on e.id = s.exercise_id
    left join public.profiles p on p.id = x.id
    where lower(e.name) = lower(btrim(p_exercise)) and e.type = 'strength'
      and not s.is_warmup and coalesce(s.reps, 0) > 0 and coalesce(s.weight_kg, 0) > 0
    order by x.id, case when s.reps = 1 then s.weight_kg else s.weight_kg * (1 + s.reps / 30.0) end desc, w.date
  ) b
  order by b.best desc
$$;

revoke all on function public.friend_week_board(), public.friend_exercise_list(), public.friend_exercise_board(text) from public;
grant execute on function public.friend_week_board(), public.friend_exercise_list(), public.friend_exercise_board(text) to authenticated;

-- ===========================================================================
-- Challenges: Freund herausfordern – 7 Tage ab Annahme, wer mehr schafft, gewinnt.
-- Gewinner +50 Credits, bei Gleichstand beide +25 (zählen ab Ende der Challenge).
-- ===========================================================================
create table if not exists public.challenges (
  id          bigint generated always as identity primary key,
  creator     uuid not null references auth.users (id) on delete cascade,
  opponent    uuid not null references auth.users (id) on delete cascade,
  metric      text not null check (metric in ('workouts', 'sets', 'volume')),
  status      text not null default 'pending' check (status in ('pending', 'active', 'declined', 'cancelled')),
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  check (creator <> opponent)
);
create index if not exists challenges_creator on public.challenges (creator);
create index if not exists challenges_opponent on public.challenges (opponent);
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

-- Punktestand einer Person im Zeitraum (Arbeitssätze, Aufwärmsätze zählen nicht)
create or replace function public.challenge_score(p_user uuid, p_metric text, p_from date, p_to date)
returns numeric language sql stable security definer set search_path = '' as $$
  select case p_metric
    when 'workouts' then (select count(distinct w.id) from public.workouts w join public.sets s on s.workout_id = w.id
                          where w.user_id = p_user and not s.is_warmup and w.date between p_from and p_to)
    when 'sets' then (select count(*) from public.sets s join public.workouts w on w.id = s.workout_id
                      where w.user_id = p_user and not s.is_warmup and w.date between p_from and p_to)
    else (select coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0) from public.sets s join public.workouts w on w.id = s.workout_id
          where w.user_id = p_user and not s.is_warmup and w.date between p_from and p_to)
  end
$$;

-- Bonus-Credits aus beendeten Challenges
create or replace function public.challenge_bonus(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(
           case
             when me > them then 50
             when me = them and me > 0 then 25
             else 0
           end), 0)::int
  from (
    select public.challenge_score(p_user, c.metric, c.start_date, c.end_date) as me,
           public.challenge_score(case when c.creator = p_user then c.opponent else c.creator end, c.metric, c.start_date, c.end_date) as them
    from public.challenges c
    where c.status = 'active' and c.end_date < current_date and (c.creator = p_user or c.opponent = p_user)
  ) x
$$;

-- Credits gesamt = Trainings + Aufgaben + Challenge-Bonus
create or replace function public.credits_total(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select public.credits_earned(p_user) + public.challenge_bonus(p_user)
$$;
revoke all on function public.challenge_score(uuid, text, date, date), public.challenge_bonus(uuid), public.credits_total(uuid) from public;

-- my_credits und Rangliste zählen ab jetzt den Challenge-Bonus mit
create or replace function public.my_credits()
returns integer language sql stable security definer set search_path = '' as $$ select public.credits_total(auth.uid()) $$;
revoke all on function public.my_credits() from public;
grant execute on function public.my_credits() to authenticated;

create or replace function public.my_challenge_bonus()
returns integer language sql stable security definer set search_path = '' as $$ select public.challenge_bonus(auth.uid()) $$;

create or replace function public.friend_leaderboard()
returns table (user_id uuid, display_name text, is_me boolean, credits integer, week_workouts integer, total_workouts integer)
language sql stable security definer set search_path = '' as $$
  select x.id, coalesce(p.display_name, 'Du'), x.id = auth.uid(),
         public.credits_total(x.id),
         (select count(*)::int from public.workouts w
           where w.user_id = x.id and w.date >= date_trunc('week', current_date)::date),
         (select count(*)::int from public.workouts w where w.user_id = x.id)
  from public.board_people() x
  left join public.profiles p on p.id = x.id
  order by 4 desc, 2
$$;

-- Herausfordern (nur Freunde, höchstens 3 offene Challenges pro Paar)
create or replace function public.create_challenge(p_opponent uuid, p_metric text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  new_id bigint;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  if not public.are_friends(auth.uid(), p_opponent) or public.is_blocked(auth.uid(), p_opponent) then
    raise exception 'Nur Freunde können herausgefordert werden.';
  end if;
  if (select count(*) from public.challenges c
      where c.status in ('pending', 'active') and (c.end_date is null or c.end_date >= current_date)
        and ((c.creator = auth.uid() and c.opponent = p_opponent) or (c.creator = p_opponent and c.opponent = auth.uid()))) >= 3 then
    raise exception 'Ihr habt schon 3 offene Challenges.';
  end if;
  insert into public.challenges (creator, opponent, metric) values (auth.uid(), p_opponent, p_metric) returning id into new_id;
  return new_id;
end;
$$;

-- Annehmen startet die 7 Tage ab heute; Ablehnen beendet sie
create or replace function public.respond_challenge(p_id bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.challenges
     set status = case when p_accept then 'active' else 'declined' end,
         start_date = case when p_accept then current_date end,
         end_date = case when p_accept then current_date + 6 end
   where id = p_id and opponent = auth.uid() and status = 'pending';
end;
$$;

-- Eigene, noch nicht angenommene Herausforderung zurückziehen
create or replace function public.cancel_challenge(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  update public.challenges set status = 'cancelled' where id = p_id and creator = auth.uid() and status = 'pending'
$$;

-- Alle eigenen Challenges mit Punktestand. state: 'incoming' | 'outgoing' | 'running' | 'won' | 'lost' | 'tie'
create or replace function public.my_challenges()
returns table (
  id bigint, other_id uuid, other_name text, metric text, state text,
  start_date date, end_date date, my_score numeric, their_score numeric, bonus integer
)
language sql stable security definer set search_path = '' as $$
  with c as (
    select c.*, case when c.creator = auth.uid() then c.opponent else c.creator end as other
    from public.challenges c
    where (c.creator = auth.uid() or c.opponent = auth.uid())
      and c.status in ('pending', 'active')
      and (c.end_date is null or c.end_date >= current_date - 30) -- beendete 30 Tage lang anzeigen
  ), s as (
    select c.*,
           case when c.status = 'active' then public.challenge_score(auth.uid(), c.metric, c.start_date, c.end_date) else 0 end as mine,
           case when c.status = 'active' then public.challenge_score(c.other, c.metric, c.start_date, c.end_date) else 0 end as theirs
    from c
    where not public.is_blocked(auth.uid(), c.other)
  )
  select s.id, s.other, coalesce(p.display_name, 'Unbekannt'), s.metric,
         case
           when s.status = 'pending' and s.opponent = auth.uid() then 'incoming'
           when s.status = 'pending' then 'outgoing'
           when s.end_date >= current_date then 'running'
           when s.mine > s.theirs then 'won'
           when s.mine < s.theirs then 'lost'
           else 'tie'
         end,
         s.start_date, s.end_date, s.mine, s.theirs,
         case
           when s.status <> 'active' or s.end_date >= current_date then 0
           when s.mine > s.theirs then 50
           when s.mine = s.theirs and s.mine > 0 then 25
           else 0
         end
  from s
  left join public.profiles p on p.id = s.other
  order by (s.status = 'pending') desc, s.end_date desc nulls first, s.created_at desc
$$;

-- ===========================================================================
-- Kommentare
-- ===========================================================================
-- Einfacher Wortfilter gegen Beleidigungen (Apple verlangt einen Filter bei Nutzerinhalten).
-- Gleiche Liste in web/src/lib/moderation.ts für sofortiges Feedback in der App.
create or replace function public.is_offensive(p_text text)
returns boolean language sql immutable set search_path = '' as $$
  select lower(p_text) ~ '(arschloch|hurensohn|wichser|fotze|missgeburt|spast|schlampe|nutte|fick|fuck|shit|bitch|cunt|nigg|neger|faggot|schwuchtel|bastard|kanake|behindert|retard|kys|kill yourself|bring dich um|nazi|heil hitler)'
$$;

create or replace function public.add_comment(p_workout bigint, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
  clean text := btrim(p_body);
  new_id bigint;
begin
  select w.user_id into owner from public.workouts w where w.id = p_workout;
  if owner is null or auth.uid() is null or not public.can_see(auth.uid(), owner) then
    raise exception 'Training nicht gefunden';
  end if;
  if char_length(clean) not between 1 and 300 then raise exception 'Kommentar: 1 bis 300 Zeichen.'; end if;
  if public.is_offensive(clean) then raise exception 'Bitte bleib freundlich – der Kommentar enthält ein gesperrtes Wort.'; end if;
  if (select count(*) from public.comments c where c.user_id = auth.uid() and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Zu viele Kommentare in kurzer Zeit. Bitte warte kurz.';
  end if;
  insert into public.comments (workout_id, user_id, body) values (p_workout, auth.uid(), clean) returning id into new_id;
  return new_id;
end;
$$;

-- Kommentare zu einem Training (ohne blockierte Personen). can_delete: eigener Kommentar oder eigenes Training
create or replace function public.workout_comments(p_workout bigint)
returns table (id bigint, user_id uuid, display_name text, body text, created_at timestamptz, is_mine boolean, can_delete boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = p_workout;
  if owner is null or auth.uid() is null or not public.can_see(auth.uid(), owner) then
    raise exception 'Training nicht gefunden';
  end if;
  return query
    select c.id, c.user_id, coalesce(p.display_name, 'Unbekannt'), c.body, c.created_at,
           c.user_id = auth.uid(), c.user_id = auth.uid() or owner = auth.uid()
    from public.comments c
    left join public.profiles p on p.id = c.user_id
    where c.workout_id = p_workout and not public.is_blocked(auth.uid(), c.user_id)
    order by c.created_at;
end;
$$;

-- Anfeuerungen und Kommentare zum eigenen Training (für die Detailansicht)
create or replace function public.workout_social(p_workout bigint)
returns table (likes integer, comments integer)
language sql stable security definer set search_path = '' as $$
  select (select count(*)::int from public.likes l where l.workout_id = w.id),
         (select count(*)::int from public.comments c where c.workout_id = w.id and not public.is_blocked(auth.uid(), c.user_id))
  from public.workouts w
  where w.id = p_workout and public.can_see(auth.uid(), w.user_id)
$$;

create or replace function public.delete_comment(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.comments c
  using public.workouts w
  where c.id = p_id and w.id = c.workout_id and (c.user_id = auth.uid() or w.user_id = auth.uid())
$$;

create or replace function public.report_comment(p_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  author uuid;
begin
  select c.user_id into author from public.comments c where c.id = p_id;
  if author is null or auth.uid() is null or author = auth.uid() then raise exception 'ungültig'; end if;
  insert into public.reports (reporter, reported, reason, comment_id)
  values (auth.uid(), author, left(coalesce(nullif(btrim(p_reason), ''), 'Kommentar gemeldet'), 500), p_id);
end;
$$;

revoke all on function
  public.my_challenge_bonus(), public.friend_leaderboard(), public.create_challenge(uuid, text),
  public.respond_challenge(bigint, boolean), public.cancel_challenge(bigint), public.my_challenges(),
  public.add_comment(bigint, text), public.workout_comments(bigint), public.workout_social(bigint),
  public.delete_comment(bigint), public.report_comment(bigint, text), public.friend_feed(integer, timestamptz)
from public;
grant execute on function
  public.my_challenge_bonus(), public.friend_leaderboard(), public.create_challenge(uuid, text),
  public.respond_challenge(bigint, boolean), public.cancel_challenge(bigint), public.my_challenges(),
  public.add_comment(bigint, text), public.workout_comments(bigint), public.workout_social(bigint),
  public.delete_comment(bigint), public.report_comment(bigint, text), public.friend_feed(integer, timestamptz)
to authenticated;

-- ===========================================================================
-- Phase 4: Shop – mit Credits Körpergraph-Looks, Farbschemata, Avatar-Teile und Titel kaufen.
-- Preise stehen nur hier (der Server prüft jeden Kauf); die App zeigt dieselbe Liste an
-- (web/src/lib/shop.ts – ein Test vergleicht beide).
-- Guthaben = verdiente Credits (credits_total) − ausgegebene Credits.
-- ===========================================================================
create table if not exists public.shop_items (
  id     text primary key,
  kind   text not null check (kind in ('skin', 'scheme', 'accessory', 'title')),
  name   text not null,
  price  integer not null check (price >= 0)
);
insert into public.shop_items (id, kind, name, price) values
  ('skin_lava',     'skin',      'Lava',             300),
  ('skin_eis',      'skin',      'Eis',              300),
  ('skin_pink',     'skin',      'Neon-Pink',        300),
  ('skin_matrix',   'skin',      'Matrix',           450),
  ('skin_gold',     'skin',      'Gold',             600),
  ('scheme_energie','scheme',    'Neon-Grün',        300),
  ('scheme_ozean',  'scheme',    'Ozean',            300),
  ('scheme_violett','scheme',    'Nacht-Violett',    300),
  ('scheme_glut',   'scheme',    'Glut',             300),
  ('scheme_kirsche','scheme',    'Kirschblüte',      400),
  ('scheme_wald',   'scheme',    'Wald',             400),
  ('scheme_mitternacht','scheme','Mitternacht',      400),
  ('scheme_sunset', 'scheme',    'Sonnenuntergang',  450),
  ('scheme_mono',   'scheme',    'Schwarz-Weiß',     450),
  ('scheme_gold',   'scheme',    'Schwarz-Gold',     500),
  ('scheme_eis',    'scheme',    'Eisblau',          500),
  ('title_early',   'title',     'Frühaufsteher',    150),
  ('title_iron',    'title',     'Eisenfresser',     200),
  ('title_reps',    'title',     'Rep-Maschine',     200),
  ('title_beast',   'title',     'Beast Mode',       400),
  ('title_legend',  'title',     'Gym-Legende',     1000)
on conflict (id) do update set kind = excluded.kind, name = excluded.name, price = excluded.price;

create table if not exists public.purchases (
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_id     text not null references public.shop_items (id),
  price       integer not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Ausgerüstet: { "skin": "skin_lava", "accessory": "acc_cap", "title": "title_iron" } – für Freunde sichtbar
alter table public.profiles add column if not exists equipped jsonb not null default '{}'::jsonb;

alter table public.shop_items enable row level security;
alter table public.purchases  enable row level security;
revoke all on public.shop_items, public.purchases from anon, authenticated;

create or replace function public.credits_spent(p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(price), 0)::int from public.purchases where user_id = p_user
$$;
revoke all on function public.credits_spent(uuid) from public;

-- Eigenes Guthaben
create or replace function public.my_wallet()
returns table (earned integer, spent integer, balance integer)
language sql stable security definer set search_path = '' as $$
  select t.e, t.s, t.e - t.s
  from (select public.credits_total(auth.uid()) as e, public.credits_spent(auth.uid()) as s) t
  where auth.uid() is not null
$$;

-- Gekaufte Artikel und was gerade ausgerüstet ist
create or replace function public.my_shop()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owned', coalesce((select jsonb_agg(p.item_id order by p.created_at) from public.purchases p where p.user_id = auth.uid()), '[]'::jsonb),
    'equipped', coalesce((select pr.equipped from public.profiles pr where pr.id = auth.uid()), '{}'::jsonb)
  )
$$;

-- Kaufen: prüft Artikel, Besitz und Guthaben; die Sperre verhindert Doppelkäufe bei schnellem Tippen.
-- Liefert das neue Guthaben.
create or replace function public.buy_item(p_item text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  item public.shop_items;
  bal integer;
begin
  if me is null then raise exception 'nicht angemeldet'; end if;
  perform pg_advisory_xact_lock(hashtext('shop:' || me::text));
  select * into item from public.shop_items where id = p_item;
  if not found then raise exception 'Diesen Artikel gibt es nicht.'; end if;
  if exists (select 1 from public.purchases where user_id = me and item_id = p_item) then
    raise exception 'Das hast du schon gekauft.';
  end if;
  bal := public.credits_total(me) - public.credits_spent(me);
  if bal < item.price then
    raise exception 'Nicht genug Credits: Dir fehlen noch %.', item.price - bal;
  end if;
  insert into public.purchases (user_id, item_id, price) values (me, p_item, item.price);
  return bal - item.price;
end;
$$;

-- Ausrüsten (p_item = null legt ab). Farbschemata gelten pro Gerät und werden nicht hier gespeichert.
create or replace function public.equip_item(p_kind text, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  if p_kind not in ('skin', 'accessory', 'title') then raise exception 'ungültig'; end if;
  if p_item is not null and not exists (
    select 1 from public.purchases p join public.shop_items i on i.id = p.item_id
    where p.user_id = auth.uid() and p.item_id = p_item and i.kind = p_kind
  ) then
    raise exception 'Das musst du zuerst kaufen.';
  end if;
  perform public.my_profile();
  update public.profiles
     set equipped = case when p_item is null then equipped - p_kind else jsonb_set(equipped, array[p_kind], to_jsonb(p_item)) end
   where id = auth.uid();
end;
$$;

-- Profil eines Freundes: zusätzlich ausgerüstete Shop-Artikel mitliefern
create or replace function public.friend_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_see(auth.uid(), p_user) then
    raise exception 'Profil nicht sichtbar';
  end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'equipped', p.equipped) from public.profiles p where p.id = p_user),
    'workouts', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'date', w.date)) from public.workouts w where w.user_id = p_user), '[]'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_object(
              'workout_id', s.workout_id, 'exercise_id', s.exercise_id, 'position', s.position, 'reps', s.reps,
              'weight_kg', s.weight_kg, 'duration_min', s.duration_min, 'distance_km', s.distance_km, 'is_warmup', s.is_warmup, 'side', s.side))
            from public.sets s where s.user_id = p_user), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'type', e.type, 'user_id', e.user_id, 'muscles', e.muscles))
            from public.exercises e where e.id in (select s.exercise_id from public.sets s where s.user_id = p_user)), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_wallet(), public.my_shop(), public.buy_item(text), public.equip_item(text, text), public.friend_profile(uuid) from public;
grant execute on function public.my_wallet(), public.my_shop(), public.buy_item(text), public.equip_item(text, text), public.friend_profile(uuid) to authenticated;

-- ===========================================================================
-- Admin: Wer Admin ist, steht nur hier auf dem Server (Tabelle admins, ohne direkten Zugriff).
-- Admin eintragen (einmal im SQL Editor, mit deiner E-Mail):
--   insert into public.admins (user_id) select id from auth.users where email = 'DEINE@EMAIL' on conflict do nothing;
-- Der Admin besitzt alle Shop-Artikel, kann eigene Farbschemata entwerfen und im Shop anbieten
-- und Meldungen bearbeiten.
-- ===========================================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (select 1 from public.admins a where a.user_id = p_user)
$$;

-- Eigene Farbschemata: Farben (palette) stehen beim Artikel; active = im Shop sichtbar
alter table public.shop_items add column if not exists palette jsonb;
alter table public.shop_items add column if not exists active boolean not null default true;

-- Shop-Katalog für die App: feste Artikel + vom Admin entworfene Farbschemata
create or replace function public.shop_catalog()
returns table (id text, kind text, name text, price integer, palette jsonb)
language sql stable security definer set search_path = '' as $$
  select i.id, i.kind, i.name, i.price, i.palette from public.shop_items i
  where i.active and auth.uid() is not null
  order by i.price, i.id
$$;

-- Eigene Artikel: Admin besitzt alles; dazu das Admin-Kennzeichen
create or replace function public.my_shop()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owned', case when public.is_admin()
      then coalesce((select jsonb_agg(i.id order by i.id) from public.shop_items i), '[]'::jsonb)
      else coalesce((select jsonb_agg(p.item_id order by p.created_at) from public.purchases p where p.user_id = auth.uid()), '[]'::jsonb) end,
    'equipped', coalesce((select pr.equipped from public.profiles pr where pr.id = auth.uid()), '{}'::jsonb),
    'admin', public.is_admin()
  )
$$;

-- Kaufen nur aktiver Artikel; Admin muss nichts kaufen
create or replace function public.buy_item(p_item text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  item public.shop_items;
  bal integer;
begin
  if me is null then raise exception 'nicht angemeldet'; end if;
  if public.is_admin(me) then raise exception 'Als Admin hast du schon alles.'; end if;
  perform pg_advisory_xact_lock(hashtext('shop:' || me::text));
  select * into item from public.shop_items where id = p_item and active;
  if not found then raise exception 'Diesen Artikel gibt es nicht.'; end if;
  if exists (select 1 from public.purchases where user_id = me and item_id = p_item) then
    raise exception 'Das hast du schon gekauft.';
  end if;
  bal := public.credits_total(me) - public.credits_spent(me);
  if bal < item.price then
    raise exception 'Nicht genug Credits: Dir fehlen noch %.', item.price - bal;
  end if;
  insert into public.purchases (user_id, item_id, price) values (me, p_item, item.price);
  return bal - item.price;
end;
$$;

-- Ausrüsten: gekauft oder Admin
create or replace function public.equip_item(p_kind text, p_item text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  if p_kind not in ('skin', 'accessory', 'title') then raise exception 'ungültig'; end if;
  if p_item is not null and not exists (select 1 from public.shop_items i where i.id = p_item and i.kind = p_kind) then
    raise exception 'ungültig';
  end if;
  if p_item is not null and not public.is_admin() and not exists (
    select 1 from public.purchases p where p.user_id = auth.uid() and p.item_id = p_item
  ) then
    raise exception 'Das musst du zuerst kaufen.';
  end if;
  perform public.my_profile();
  update public.profiles
     set equipped = case when p_item is null then equipped - p_kind else jsonb_set(equipped, array[p_kind], to_jsonb(p_item)) end
   where id = auth.uid();
end;
$$;

-- Prüft ein Farbschema: { "light": {bg, surface, text, accent}, "dark": {…}, "neon": "#rrggbb" }
create or replace function public.valid_palette(p jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce((
    select bool_and(coalesce(p #>> array[m, k], '') ~ '^#[0-9a-fA-F]{6}$')
    from unnest(array['light', 'dark']) m, unnest(array['bg', 'surface', 'text', 'accent']) k
  ), false) and coalesce(p ->> 'neon', '') ~ '^#[0-9a-fA-F]{6}$'
$$;

-- Admin: eigenes Farbschema speichern (neu oder ändern). id: scheme_c_… (klein, Ziffern, _)
create or replace function public.admin_save_scheme(p_id text, p_name text, p_price integer, p_palette jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  if p_id !~ '^scheme_c_[a-z0-9_]{1,30}$' then raise exception 'Ungültige Kennung.'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 30 then raise exception 'Name: 1 bis 30 Zeichen.'; end if;
  if p_price is null or p_price < 0 or p_price > 100000 then raise exception 'Preis: 0 bis 100000.'; end if;
  if not public.valid_palette(p_palette) then raise exception 'Ungültige Farben.'; end if;
  insert into public.shop_items (id, kind, name, price, palette, active)
  values (p_id, 'scheme', btrim(p_name), p_price, p_palette, true)
  on conflict (id) do update set name = excluded.name, price = excluded.price, palette = excluded.palette, active = true;
end;
$$;

-- Admin: eigenes Farbschema aus dem Shop nehmen (wer es gekauft hat, behält es)
create or replace function public.admin_hide_scheme(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  update public.shop_items set active = false where id = p_id and id like 'scheme\_c\_%';
end;
$$;

-- Admin: Meldungen ansehen
create or replace function public.admin_reports()
returns table (id bigint, created_at timestamptz, reason text, reporter_name text, reported uuid, reported_name text,
               comment_id bigint, comment_body text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  return query
    select r.id, r.created_at, r.reason, coalesce(p1.display_name, '?'), r.reported, coalesce(p2.display_name, '?'),
           r.comment_id, c.body
    from public.reports r
    left join public.profiles p1 on p1.id = r.reporter
    left join public.profiles p2 on p2.id = r.reported
    left join public.comments c on c.id = r.comment_id
    order by r.created_at desc
    limit 200;
end;
$$;

-- Admin: Meldung erledigen, optional den gemeldeten Kommentar löschen
create or replace function public.admin_resolve_report(p_id bigint, p_delete_comment boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  cid bigint;
begin
  if not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  select r.comment_id into cid from public.reports r where r.id = p_id;
  if p_delete_comment and cid is not null then
    delete from public.comments where id = cid;
  end if;
  delete from public.reports where id = p_id;
end;
$$;

revoke all on function
  public.is_admin(uuid), public.shop_catalog(), public.my_shop(), public.buy_item(text), public.equip_item(text, text),
  public.valid_palette(jsonb), public.admin_save_scheme(text, text, integer, jsonb), public.admin_hide_scheme(text),
  public.admin_reports(), public.admin_resolve_report(bigint, boolean)
from public;
grant execute on function
  public.shop_catalog(), public.my_shop(), public.buy_item(text), public.equip_item(text, text),
  public.admin_save_scheme(text, text, integer, jsonb), public.admin_hide_scheme(text),
  public.admin_reports(), public.admin_resolve_report(bigint, boolean)
to authenticated;

-- ===========================================================================
-- Härtung: Supabase gibt neuen Funktionen standardmäßig Ausführrechte für anon und authenticated.
-- Interne Hilfsfunktionen sollen nur von anderen Server-Funktionen aufgerufen werden.
-- ===========================================================================
revoke execute on function
  public.credits_earned(uuid), public.credits_spent(uuid), public.credits_total(uuid),
  public.challenge_score(uuid, text, date, date), public.challenge_bonus(uuid),
  public.are_friends(uuid, uuid), public.is_blocked(uuid, uuid), public.can_see(uuid, uuid),
  public.new_friend_code(), public.board_people(), public.is_admin(uuid), public.valid_palette(jsonb)
from anon, authenticated;

-- ===========================================================================
-- Wochenziel (Trainings pro Woche) für die Tages-Serie; Freunde sehen es mit dem Profil
-- ===========================================================================
alter table public.profiles add column if not exists week_goal smallint not null default 2;
alter table public.profiles drop constraint if exists profiles_week_goal_check;
alter table public.profiles add constraint profiles_week_goal_check check (week_goal between 1 and 7);

create or replace function public.my_week_goal()
returns integer language plpgsql security definer set search_path = '' as $$
begin
  perform public.my_profile();
  return (select p.week_goal from public.profiles p where p.id = auth.uid());
end;
$$;

create or replace function public.set_week_goal(p_goal integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_goal is null or p_goal not between 1 and 7 then raise exception 'Wochenziel: 1 bis 7.'; end if;
  perform public.my_profile();
  update public.profiles set week_goal = p_goal where id = auth.uid();
end;
$$;

-- Profil eines Freundes: zusätzlich Wochenziel (für seine Serie)
create or replace function public.friend_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_see(auth.uid(), p_user) then
    raise exception 'Profil nicht sichtbar';
  end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'equipped', p.equipped, 'week_goal', p.week_goal) from public.profiles p where p.id = p_user),
    'workouts', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'date', w.date)) from public.workouts w where w.user_id = p_user), '[]'::jsonb),
    'sets', coalesce((select jsonb_agg(jsonb_build_object(
              'workout_id', s.workout_id, 'exercise_id', s.exercise_id, 'position', s.position, 'reps', s.reps,
              'weight_kg', s.weight_kg, 'duration_min', s.duration_min, 'distance_km', s.distance_km, 'is_warmup', s.is_warmup, 'side', s.side))
            from public.sets s where s.user_id = p_user), '[]'::jsonb),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'type', e.type, 'user_id', e.user_id, 'muscles', e.muscles))
            from public.exercises e where e.id in (select s.exercise_id from public.sets s where s.user_id = p_user)), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_week_goal(), public.set_week_goal(integer), public.friend_profile(uuid) from public, anon;
grant execute on function public.my_week_goal(), public.set_week_goal(integer), public.friend_profile(uuid) to authenticated;

-- ===========================================================================
-- Pro-Abo: Wer Pro hat, steht nur hier auf dem Server (Tabelle subscriptions, ohne direkten Zugriff).
-- Später trägt ein Server-Dienst (Store-Kauf über RevenueCat) hier ein; die App kann es nicht selbst setzen.
-- Admins haben immer Pro. Zum Testen für andere Konten (im SQL Editor):
--   select public.admin_grant_pro('USER-ID', now() + interval '1 year');   -- einschalten
--   select public.admin_grant_pro('USER-ID', null);                         -- wieder aus
--   select public.admin_grant_food('USER-ID', now() + interval '1 year');   -- Zusatz „Essen+“ (braucht Pro)
-- ===========================================================================
create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  pro_until  timestamptz,
  source     text not null default 'manual',
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;

-- Zusatz-Abo „Essen+“ (Rezepte mit Anleitung): gibt es zusätzlich zu Pro
alter table public.subscriptions add column if not exists food_until timestamptz;

create or replace function public.my_pro()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'pro', public.is_admin() or coalesce((select s.pro_until > now() from public.subscriptions s where s.user_id = auth.uid()), false),
    'until', (select s.pro_until from public.subscriptions s where s.user_id = auth.uid()),
    'admin', public.is_admin(),
    'food', public.is_admin() or coalesce((select s.pro_until > now() and s.food_until > now() from public.subscriptions s where s.user_id = auth.uid()), false),
    'food_until', (select s.food_until from public.subscriptions s where s.user_id = auth.uid()))
$$;

create or replace function public.admin_grant_pro(p_user uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Aufruf im SQL Editor (kein angemeldeter Nutzer) oder durch einen Admin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  insert into public.subscriptions (user_id, pro_until, source, updated_at) values (p_user, p_until, 'manual', now())
  on conflict (user_id) do update set pro_until = excluded.pro_until, source = 'manual', updated_at = now();
end;
$$;
create or replace function public.admin_grant_food(p_user uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Nur für Admins.'; end if;
  insert into public.subscriptions (user_id, food_until, source, updated_at) values (p_user, p_until, 'manual', now())
  on conflict (user_id) do update set food_until = excluded.food_until, source = 'manual', updated_at = now();
end;
$$;
revoke all on function public.admin_grant_food(uuid, timestamptz) from public, anon;
grant execute on function public.admin_grant_food(uuid, timestamptz) to authenticated;
revoke all on function public.my_pro(), public.admin_grant_pro(uuid, timestamptz) from public, anon;
grant execute on function public.my_pro() to authenticated;
grant execute on function public.admin_grant_pro(uuid, timestamptz) to authenticated;

-- ===========================================================================
-- Essen tracken (nur Pro): Mahlzeiten pro Tag mit Kalorien und Nährwerten.
-- Zugriff nur über die Funktionen unten; Hinzufügen prüft Pro auf dem Server, Ansehen/Löschen geht immer.
-- ===========================================================================
create table if not exists public.food_entries (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date       date not null default current_date,
  meal       text not null check (meal in ('fruehstueck', 'mittag', 'abend', 'snack')),
  name       text not null check (length(trim(name)) between 1 and 120),
  brand      text check (brand is null or length(brand) <= 120),
  amount_g   numeric(8, 2) check (amount_g is null or (amount_g > 0 and amount_g <= 100000)),
  kcal       numeric(8, 1) not null check (kcal >= 0 and kcal <= 20000),
  protein    numeric(7, 1) not null default 0 check (protein >= 0 and protein <= 2000),
  carbs      numeric(7, 1) not null default 0 check (carbs >= 0 and carbs <= 5000),
  fat        numeric(7, 1) not null default 0 check (fat >= 0 and fat <= 2000),
  barcode    text check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  source     text not null default 'manual' check (source in ('manual', 'search', 'barcode', 'photo')),
  created_at timestamptz not null default now()
);
create index if not exists food_entries_user_date on public.food_entries (user_id, date);
alter table public.food_entries enable row level security;
revoke all on public.food_entries from anon, authenticated;

create table if not exists public.nutrition_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kcal    integer not null check (kcal between 800 and 10000)
);
alter table public.nutrition_goals enable row level security;
revoke all on public.nutrition_goals from anon, authenticated;

create or replace function public.has_pro(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and (public.is_admin(p_user)
    or coalesce((select s.pro_until > now() from public.subscriptions s where s.user_id = p_user), false))
$$;

create or replace function public.food_add(
  p_date date, p_meal text, p_name text, p_brand text, p_amount numeric,
  p_kcal numeric, p_protein numeric, p_carbs numeric, p_fat numeric, p_barcode text, p_source text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if not public.has_pro() then raise exception 'Kalorien tracken gibt es mit Pro.'; end if;
  if p_date < current_date - 400 or p_date > current_date + 1 then raise exception 'Ungültiges Datum.'; end if;
  insert into public.food_entries (user_id, date, meal, name, brand, amount_g, kcal, protein, carbs, fat, barcode, source)
  values (auth.uid(), p_date, p_meal, trim(p_name), nullif(trim(coalesce(p_brand, '')), ''), p_amount, p_kcal,
          coalesce(p_protein, 0), coalesce(p_carbs, 0), coalesce(p_fat, 0), nullif(p_barcode, ''), coalesce(p_source, 'manual'))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.food_list(p_date date)
returns table (id bigint, meal text, name text, brand text, amount_g numeric, kcal numeric, protein numeric, carbs numeric, fat numeric, source text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.meal, f.name, f.brand, f.amount_g, f.kcal, f.protein, f.carbs, f.fat, f.source
  from public.food_entries f where f.user_id = auth.uid() and f.date = p_date order by f.created_at, f.id
$$;

create or replace function public.food_delete(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.food_entries where id = p_id and user_id = auth.uid()
$$;

create or replace function public.my_nutrition_goal()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select g.kcal from public.nutrition_goals g where g.user_id = auth.uid()), 2500)
$$;

create or replace function public.set_nutrition_goal(p_kcal integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if p_kcal is null or p_kcal < 800 or p_kcal > 10000 then raise exception 'Das Tagesziel muss zwischen 800 und 10000 kcal liegen.'; end if;
  insert into public.nutrition_goals (user_id, kcal) values (auth.uid(), p_kcal)
  on conflict (user_id) do update set kcal = excluded.kcal;
end;
$$;

revoke all on function public.has_pro(uuid), public.food_add(date, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text),
  public.food_list(date), public.food_delete(bigint), public.my_nutrition_goal(), public.set_nutrition_goal(integer) from public, anon;
grant execute on function public.food_add(date, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text),
  public.food_list(date), public.food_delete(bigint), public.my_nutrition_goal(), public.set_nutrition_goal(integer) to authenticated;

-- ===========================================================================
-- Profilbild: privater Speicher „avatars“, ein Bild pro Nutzer unter <user-id>/avatar.jpg.
-- Sehen dürfen es nur der Besitzer und bestätigte Freunde (gleiche Regel wie das Profil, can_see).
-- Die App lädt ein verkleinertes Quadrat (max. 256 × 256 px) hoch und holt Freundesbilder über kurzlebige Links.
-- ===========================================================================
alter table public.profiles add column if not exists avatar_v integer;

create or replace function public.can_view_avatar(p_owner text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and p_owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and public.can_see(auth.uid(), p_owner::uuid)
$$;
revoke all on function public.can_view_avatar(text) from public, anon;
grant execute on function public.can_view_avatar(text) to authenticated;

-- Version des eigenen Bildes (null = keins); beim Hochladen hochzählen, damit Bilder neu geladen werden
create or replace function public.set_my_avatar(p_on boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  perform public.my_profile();
  update public.profiles
     set avatar_v = case when p_on then coalesce(avatar_v, 0) + 1 else null end
   where id = auth.uid()
  returning avatar_v into v;
  return v;
end;
$$;

create or replace function public.my_avatar()
returns integer language sql stable security definer set search_path = '' as $$
  select p.avatar_v from public.profiles p where p.id = auth.uid()
$$;

-- Freunde (und ich), die ein Bild haben und es mir zeigen dürfen
create or replace function public.friend_avatars()
returns table (user_id uuid, v integer) language sql stable security definer set search_path = '' as $$
  select p.id, p.avatar_v from public.profiles p
  where p.avatar_v is not null and auth.uid() is not null and public.can_see(auth.uid(), p.id)
$$;
revoke all on function public.set_my_avatar(boolean), public.my_avatar(), public.friend_avatars() from public, anon;
grant execute on function public.set_my_avatar(boolean), public.my_avatar(), public.friend_avatars() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 524288, allowed_mime_types = array['image/jpeg'];

drop policy if exists "avatars: sehen (ich und Freunde)" on storage.objects;
create policy "avatars: sehen (ich und Freunde)" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_avatar((storage.foldername(name))[1]));
drop policy if exists "avatars: eigenes hochladen" on storage.objects;
create policy "avatars: eigenes hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and name = auth.uid()::text || '/avatar.jpg');
drop policy if exists "avatars: eigenes ersetzen" on storage.objects;
create policy "avatars: eigenes ersetzen" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and name = auth.uid()::text || '/avatar.jpg');
drop policy if exists "avatars: eigenes löschen" on storage.objects;
create policy "avatars: eigenes löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
-- Foto-KI fürs Essen: Zähler pro Tag. Die Edge Function „food-photo“ ruft das mit dem Service-Schlüssel auf
-- (Nutzer können es nicht selbst aufrufen, sonst könnten sie das Tageslimit zurücksetzen).
-- ===========================================================================
create table if not exists public.food_ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  n       integer not null default 0,
  primary key (user_id, day)
);
alter table public.food_ai_usage enable row level security;
revoke all on public.food_ai_usage from anon, authenticated;

-- Zählt eine Auswertung; liefert die verbleibenden für heute. Fehler: PRO_REQUIRED, DAILY_LIMIT
create or replace function public.food_ai_claim(p_user uuid, p_limit integer default 20)
returns integer language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if not public.has_pro(p_user) then raise exception 'PRO_REQUIRED'; end if;
  insert into public.food_ai_usage (user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = public.food_ai_usage.n + 1 where public.food_ai_usage.n < p_limit
  returning n into used;
  if used is null then raise exception 'DAILY_LIMIT'; end if;
  return p_limit - used;
end;
$$;
create or replace function public.food_ai_refund(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.food_ai_usage set n = greatest(n - 1, 0) where user_id = p_user and day = current_date
$$;
revoke all on function public.food_ai_claim(uuid, integer), public.food_ai_refund(uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.food_ai_claim(uuid, integer), public.food_ai_refund(uuid) to service_role;
  end if;
end $$;

-- ===========================================================================
-- Version dieses Skripts. Bei JEDER Änderung an dieser Datei erhöhen (und SCHEMA_VERSION in
-- web/src/data/config.ts genauso) – die App zeigt dem Admin dann „Datenbank-Update nötig“.
-- ===========================================================================
create or replace function public.schema_version()
returns integer language sql immutable set search_path = '' as $$ select 46 $$;
revoke all on function public.schema_version() from public, anon;
grant execute on function public.schema_version() to authenticated;
