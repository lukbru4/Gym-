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
