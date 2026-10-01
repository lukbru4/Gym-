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
-- Credits serverseitig berechnen – gleiche Regeln wie js/xp.js und js/quests.js:
--   Training: +20 pro Training mit mindestens einem Arbeitssatz, +2 pro Arbeitssatz,
--             +10 wenn eine Kraftübung stärker ist als beim letzten Mal (geschätztes 1RM, Epley),
--             +25 zusätzlich bei neuem Rekord der Übung. Aufwärmsätze zählen nicht.
--   Tägliche Aufgaben (pro Kalendertag): trainiert +15, ≥ 10 Arbeitssätze +10, ≥ 1 Rekord +20.
--   Wöchentliche Aufgaben (Woche ab Montag): an ≥ 3 Tagen trainiert +50, ≥ 3 Steigerungen +40.
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
    if (d ->> 'sets')::int > 0 then total := total + 15; end if;
    if (d ->> 'sets')::int >= 10 then total := total + 10; end if;
    if (d ->> 'records')::int >= 1 then total := total + 20; end if;
  end loop;
  for k in select jsonb_object_keys(weeks) loop
    d := weeks -> k;
    if (select count(*) from jsonb_object_keys(d -> 'days')) >= 3 then total := total + 50; end if;
    if (d ->> 'improvements')::int >= 3 then total := total + 40; end if;
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

-- Kein direkter Zugriff auf diese Tabellen – nur über die Funktionen unten.
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks      enable row level security;
alter table public.reports     enable row level security;
alter table public.likes       enable row level security;
revoke all on public.profiles, public.friendships, public.blocks, public.reports, public.likes from anon, authenticated;

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
create or replace function public.friend_feed(p_limit integer default 30, p_before timestamptz default null)
returns table (
  workout_id bigint, user_id uuid, display_name text, date date, created_at timestamptz,
  sets integer, volume numeric, exercises text[], likes integer, liked boolean
)
language sql stable security definer set search_path = '' as $$
  select w.id, w.user_id, p.display_name, w.date, w.created_at,
         (select count(*)::int from public.sets s where s.workout_id = w.id and not s.is_warmup),
         (select coalesce(sum(coalesce(s.reps, 0) * coalesce(s.weight_kg, 0)), 0) from public.sets s
           where s.workout_id = w.id and not s.is_warmup),
         (select array_agg(distinct e.name order by e.name) from public.sets s join public.exercises e on e.id = s.exercise_id
           where s.workout_id = w.id),
         (select count(*)::int from public.likes l where l.workout_id = w.id),
         exists (select 1 from public.likes l where l.workout_id = w.id and l.user_id = auth.uid())
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
              'weight_kg', s.weight_kg, 'duration_min', s.duration_min, 'distance_km', s.distance_km, 'is_warmup', s.is_warmup))
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
