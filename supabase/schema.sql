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

-- Katalog aufräumen: umbenannte und zusammengeführte Standardübungen (Verlauf, Sätze und Vorlagen bleiben erhalten).
-- Gibt es den neuen Namen noch nicht, wird umbenannt; sonst werden Sätze und Vorlagen auf die bestehende Übung umgehängt.
do $$
declare
  r record;
  old_id bigint;
  new_id bigint;
begin
  for r in select * from (values
    ('Bankdrücken (Kurzhantel, Schrägbank)', 'Schrägbankdrücken (Kurzhantel)'),
    ('Schrägbank-Brustpresse (Maschine)', 'Brustpresse (Maschine, Schrägbank)'),
    ('Negativ-Bankdrücken (Kurzhantel)', 'Negativbankdrücken (Kurzhantel)'),
    ('Fliegende (Schrägbank)', 'Fliegende (Kurzhantel, Schrägbank)'),
    ('Cable Crossover von unten', 'Cable Crossover (Kabelzug, von unten)'),
    ('Cable Crossover von oben', 'Cable Crossover (Kabelzug, von oben)'),
    ('Brustfliegende (Kabel, einarmig)', 'Cable Crossover (Kabelzug, einarmig)'),
    ('Fliegende (Maschine, Schrägbank)', 'Butterfly (Maschine, Schrägbank)'),
    ('Kabelzug-Brustdrücken (kniend)', 'Brustpresse (Kabel, kniend)'),
    ('Brustpresse (Kettlebell, liegend)', 'Bankdrücken (Kettlebell)'),
    ('Brustpresse (Kettlebell, Boden)', 'Floor Press (Kettlebell)'),
    ('Kurzhantel-Schrägbankdrücken (neutraler Griff)', 'Schrägbankdrücken (Kurzhantel, neutraler Griff)'),
    ('Negativ-Schrägbankdrücken', 'Negativbankdrücken (Langhantel)'),
    ('Negativbankdrücken (Maschine)', 'Brustpresse (Maschine, Negativbank)'),
    ('Kabelzug-Brustdrücken (stehend)', 'Brustpresse (Kabel, stehend)'),
    ('Kabelzug-Brustdrücken (einarmig)', 'Brustpresse (Kabel, einarmig)'),
    ('Kabelzug-Brustdrücken (sitzend)', 'Brustpresse (Kabel, sitzend)'),
    ('Kabelzug-Brustdrücken (Schrägbank)', 'Schrägbankdrücken (Kabel)'),
    ('Kabelzug-Brustdrücken (Negativbank)', 'Negativbankdrücken (Kabel)'),
    ('Fliegende (Kabel, stehend)', 'Cable Crossover (Kabelzug)'),
    ('Brustpresse (Widerstandsband, liegend)', 'Bankdrücken (Widerstandsband)'),
    ('Pulldown (Seil)', 'Geradarm-Latziehen (Kabel, Seil)'),
    ('Kurzhantel-Pullover (Schrägbank)', 'Pullover (Kurzhantel, Schrägbank)'),
    ('Kurzhantel-Pullover (Boden)', 'Pullover (Kurzhantel, Boden)'),
    ('Kurzhantel-Pullover (einarmig)', 'Pullover (Kurzhantel, einarmig)'),
    ('Rudern am Kabel (Seil zum Hals)', 'Kabelrudern (Seil, zum Hals)'),
    ('Scapular Pull (Widerstandsband)', 'Skapula-Klimmzüge (Widerstandsband)'),
    ('Scapular Pull (Ringe)', 'Skapula-Klimmzüge (Ringe)'),
    ('Rudern (Langhantel, vorgebeugt)', 'Langhantelrudern'),
    ('Rudern (Kurzhantel, einarmig)', 'Kurzhantelrudern (einarmig)'),
    ('Rudern (Kurzhantel, vorgebeugt)', 'Rudern (Kurzhantel, beidarmig)'),
    ('Rudern (Untergriff, Langhantel)', 'Rudern (Langhantel, Untergriff)'),
    ('Latziehen (Maschine)', 'Latziehen'),
    ('Pulldown (Kabel, sitzend)', 'Latziehen'),
    ('Pulldown (Maschine)', 'Latziehen'),
    ('Pulldown (Kabel, einarmig)', 'Latziehen (einarmig)'),
    ('Pulldown (Kabel, kniend)', 'Latziehen (kniend)'),
    ('Pulldown (Kabel, stehend)', 'Geradarm-Latziehen (Kabel)'),
    ('Pulldown (Widerstandsband)', 'Latziehen (Widerstandsband)'),
    ('Seilzug-Pullover', 'Pullover (Kabel)'),
    ('Kurzhantel-Pullover (Bank)', 'Pullover (Kurzhantel, Bank)'),
    ('Superman (Boden)', 'Superman'),
    ('Hyperextensions (Römischer Stuhl)', 'Hyperextensions'),
    ('Hyperextensions (Römischer Stuhl, einbeinig)', 'Hyperextensions (einbeinig)'),
    ('Scapular Pull (Körpergewicht)', 'Skapula-Klimmzüge'),
    ('Farmers Walk (Kurzhantel)', 'Farmers Walk'),
    ('Farmers Walk (schwer)', 'Farmers Walk'),
    ('Farmers Walk (lange Schritte)', 'Farmers Walk'),
    ('Farmers Walk (kurze Schritte)', 'Farmers Walk'),
    ('Curls (Reverse, Kurzhantel)', 'Reverse Curls (Kurzhantel)'),
    ('Curls (Reverse, SZ-Stange)', 'Reverse Curls (SZ-Stange)'),
    ('Curls (Kabel, kniend)', 'Bizepscurls (Kabel, kniend)'),
    ('Kabelcurls (liegend)', 'Bizepscurls (Kabel, liegend)'),
    ('Bizepscurls (Seil, Kabel)', 'Bizepscurls (Kabel, Seil)'),
    ('Hammercurls (Schrägbank)', 'Hammercurls (Kurzhantel, Schrägbank)'),
    ('Trizepsdrücken (Untergriff, Kabel)', 'Trizepsdrücken (Kabel, Untergriff)'),
    ('Überkopf-Trizepsstrecken (einarmig, Kurzhantel)', 'Überkopf-Trizepsstrecken (Kurzhantel, einarmig)'),
    ('Liegestütze mit Trizeps-Fokus (kniend)', 'Liegestütze (enger Griff, kniend)'),
    ('Liegestütze mit Trizeps-Fokus (Schlingentrainer)', 'Liegestütze (enger Griff, Schlingentrainer)'),
    ('Liegestütze mit Trizeps-Fokus (Schrägbank)', 'Liegestütze (enger Griff, Schrägbank)'),
    ('Liegestütze mit Trizeps-Fokus (Ringe)', 'Liegestütze (enger Griff, Ringe)'),
    ('Liegestütze mit Trizeps-Fokus (gewichtet)', 'Liegestütze (enger Griff, gewichtet)'),
    ('Liegestütze mit Trizeps-Fokus (SZ-Stange)', 'Liegestütze (enger Griff, SZ-Stange)'),
    ('Bizepscurls (Langhantel)', 'Bizepscurls'),
    ('Bizepscurls (Kurzhantel, stehend)', 'Bizepscurls (Kurzhantel)'),
    ('Curls (Konzentration, Kurzhantel)', 'Konzentrationscurls'),
    ('Curls (Spider, Kurzhantel)', 'Spider Curls'),
    ('Curls (Kurzhantel, Zottman)', 'Zottman Curls'),
    ('Curls (21er)', '21er Curls'),
    ('Schrägbank-Curls', 'Bizepscurls (Kurzhantel, Schrägbank)'),
    ('Scott-Curls (einarmig, Kurzhantel)', 'Scott-Curls (Kurzhantel)'),
    ('Handgelenkcurls', 'Unterarmcurls (Langhantel)'),
    ('Trizepsdrücken (Stange, Kabel)', 'Trizepsdrücken (Kabel, Stange)'),
    ('Trizepsdrücken (einarmig, Kabel)', 'Trizepsdrücken (Kabel, Obergriff, einarmig)'),
    ('Überkopf-Trizepsstrecken (Kabel, stehend)', 'Überkopf-Trizepsstrecken (Kabel)'),
    ('Überkopf-Trizepsstrecken (Kurzhantel, stehend)', 'Überkopf-Trizepsstrecken (Kurzhantel)'),
    ('French Press (SZ-Stange)', 'French Press'),
    ('French Press (Kurzhantel, liegend)', 'French Press (Kurzhantel)'),
    ('Trizeps-Extension (Bank, Kurzhantel)', 'French Press (Kurzhantel)'),
    ('Trizeps-Extension (Kabel, liegend)', 'French Press (Kabel)'),
    ('Trizeps-Kickbacks (Kurzhantel, einarmig)', 'Trizeps-Kickbacks'),
    ('Trizeps-Kickbacks (Kabel, einarmig)', 'Trizeps-Kickbacks (Kabel)'),
    ('Trizepsdips (Bank)', 'Bank-Dips'),
    ('Dips (Bank, einbeinig)', 'Trizepsdips (Bank, einbeinig)'),
    ('Trizepsdips (Maschine)', 'Dip-Maschine'),
    ('Bankdrücken (Trizeps-Fokus, Smith-Maschine)', 'Enges Bankdrücken (Smith-Maschine)'),
    ('Close-Grip Liegestütze', 'Liegestütze (enger Griff)'),
    ('Liegestütze mit Trizeps-Fokus (Boden)', 'Liegestütze (enger Griff)'),
    ('Kniebeuge (Langhantel, hoch)', 'Kniebeuge'),
    ('Kniebeuge (Langhantel, breiter Griff)', 'Kniebeuge'),
    ('Kniebeuge (Langhantel, enger Griff)', 'Kniebeuge'),
    ('Kniebeuge (Langhantel, Pause)', 'Kniebeuge (Pause)'),
    ('Ausfallschritte (Kurzhantel, stehend)', 'Ausfallschritte (Kurzhantel)'),
    ('Ausfallschritte (Kurzhantel, wechselseitig)', 'Ausfallschritte (Kurzhantel)'),
    ('Step-ups (Körpergewicht)', 'Step-ups'),
    ('Bulgarische Kniebeuge (Körpergewicht)', 'Bulgarische Kniebeuge'),
    ('Beinpresse (liegend, einarmig)', 'Beinpresse (liegend, einbeinig)'),
    ('Beinpresse (einbeinig)', 'Beinpresse (liegend, einbeinig)'),
    ('Beinstrecker (einarmig)', 'Beinstrecker (einbeinig)'),
    ('Beinstrecker (langsam)', 'Beinstrecker (sitzend, langsam)'),
    ('Beinstrecker (Pause)', 'Beinstrecker (sitzend, Pause)'),
    ('Beinbeuger (einbeinig, liegend)', 'Beinbeuger (liegend, einbeinig)'),
    ('Sled Push (leicht)', 'Schlittenschieben'),
    ('Sled Push (schwer)', 'Schlittenschieben'),
    ('Hip Thrust (einbeinig)', 'Hip Thrust (Körpergewicht, einbeinig)'),
    ('Kabel-Kickbacks (stehend)', 'Kabel-Kickbacks (Gesäß)'),
    ('Kabel-Kickbacks (Maschine)', 'Gesäßmaschine (Kickback)'),
    ('Seitliches Beinheben (stehend)', 'Seitliches Beinheben'),
    ('Seitliches Beinheben (Kabel, stehend)', 'Seitliches Beinheben (Kabel)'),
    ('Abduktoren (seitlich, Widerstandsband)', 'Abduktoren (Widerstandsband, liegend)'),
    ('Kettlebell Swing (leicht)', 'Kettlebell Swing'),
    ('Kettlebell Swing (schwer)', 'Kettlebell Swing'),
    ('Kettlebell Swing (explosiv)', 'Kettlebell Swing'),
    ('Kettlebell Swing (russisch)', 'Kettlebell Swing'),
    ('Wadenheben (einbeinig, Kurzhantel)', 'Wadenheben (stehend, Kurzhantel, einbeinig)'),
    ('Crunches (Kabel, kniend)', 'Cable Crunches (Kabel)'),
    ('Crunches (Kabel, Seil)', 'Cable Crunches (Kabel)'),
    ('Cable Crunches (kniend, Seil)', 'Cable Crunches (Kabel)'),
    ('Cable Crunches (stehend, Seil)', 'Crunches (Kabel, stehend)'),
    ('Plank (seitlich)', 'Seitstütz'),
    ('Bauchrad (kniend)', 'Ab Wheel Rollout'),
    ('Zehen-zur-Stange (strikt)', 'Toes to Bar'),
    ('Knieheben (im Stütz)', 'Knieheben (Römischer Stuhl)'),
    ('Hollow Hold (Schaukel)', 'Hollow Rock'),
    ('Tragen (Koffer, Kurzhantel)', 'Suitcase Carry'),
    ('Sled Push (einarmig)', 'Schlittenschieben (einarmig)'),
    ('Sled Push (rückwärts)', 'Schlittenschieben (rückwärts)'),
    ('Sled Push (Sprint)', 'Schlittenschieben (Sprint)'),
    ('Sled Push (hoch)', 'Schlittenschieben (hohe Griffe)'),
    ('Sled Push (tief)', 'Schlittenschieben (tiefe Griffe)'),
    ('Sled Pull (Schlitten ziehen)', 'Schlittenziehen'),
    ('Ausfallschritte rückwärts', 'Ausfallschritte (rückwärts)'),
    ('Seitliche Ausfallschritte', 'Ausfallschritte (seitlich)'),
    ('Ausfallschritte (gehend, Langhantel)', 'Ausfallschritte (Langhantel, gehend)'),
    ('Zehen-zur-Stange (gewichtet)', 'Toes to Bar (gewichtet)'),
    ('Zehen-zur-Stange (langsam)', 'Toes to Bar (langsam)'),
    ('Zehen-zur-Stange (Ringe)', 'Toes to Bar (Ringe)'),
    ('Zehen-zur-Stange (einarmig)', 'Toes to Bar (einarmig)'),
    ('Zehen-zur-Stange (Kipping)', 'Toes to Bar (Kipping)'),
    ('Zehen-zur-Stange (seitlich)', 'Toes to Bar (seitlich)'),
    ('Cable Crunches (sitzend, Seil)', 'Cable Crunches (sitzend)'),
    ('Cable Crunches (liegend, Seil)', 'Cable Crunches (liegend)'),
    ('Cable Crunches (kniend, Stange)', 'Cable Crunches (Stange)'),
    ('Cable Crunches (kniend, mit Drehung)', 'Cable Crunches (mit Drehung)'),
    ('Cable Crunches (kniend, seitlich)', 'Cable Crunches (seitlich)'),
    ('Kettlebell Windmill (einarmig)', 'Kettlebell Windmill'),
    ('Kettlebell Windmill (leicht)', 'Kettlebell Windmill'),
    ('Kettlebell Windmill (schwer)', 'Kettlebell Windmill')
  ) as v(old_name, new_name) loop
    select e.id into old_id from public.exercises e where e.user_id is null and e.name = r.old_name;
    continue when old_id is null;
    select e.id into new_id from public.exercises e where e.user_id is null and lower(e.name) = lower(r.new_name);
    if new_id is null then
      update public.exercises set name = r.new_name where id = old_id;
    else
      update public.sets set exercise_id = new_id where exercise_id = old_id;
      update public.templates t
         set exercises = (select jsonb_agg(case when (x ->> 'exercise_id')::bigint = old_id
                                                then jsonb_set(x, '{exercise_id}', to_jsonb(new_id)) else x end order by i)
                            from jsonb_array_elements(t.exercises) with ordinality as a(x, i))
       where t.exercises @> jsonb_build_array(jsonb_build_object('exercise_id', old_id));
      delete from public.exercises where id = old_id;
    end if;
  end loop;
end $$;
-- Ende Katalog aufräumen

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
  (null, 'Laufen (draußen)', 'cardio', '{}'),
  (null, 'Schrägbankdrücken (Kurzhantel)', 'strength', '{brust}'),
  (null, 'Negativbankdrücken (Kurzhantel)', 'strength', '{brust}'),
  (null, 'Brustpresse (Maschine)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, Schrägbank)', 'strength', '{brust,schultern}'),
  (null, 'Bankdrücken (Smith-Maschine)', 'strength', '{brust,trizeps}'),
  (null, 'Schrägbankdrücken (Smith-Maschine)', 'strength', '{brust,schultern}'),
  (null, 'Fliegende (Kurzhantel)', 'strength', '{brust}'),
  (null, 'Fliegende (Kurzhantel, Schrägbank)', 'strength', '{brust}'),
  (null, 'Cable Crossover (Kabelzug)', 'strength', '{brust}'),
  (null, 'Cable Crossover (Kabelzug, von unten)', 'strength', '{brust}'),
  (null, 'Cable Crossover (Kabelzug, von oben)', 'strength', '{brust}'),
  (null, 'Liegestütze', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Füße erhöht)', 'strength', '{brust,schultern}'),
  (null, 'Pullover (Kurzhantel)', 'strength', '{brust,lat}'),
  (null, 'Dips (Brust-Fokus)', 'strength', '{brust,trizeps}'),
  (null, 'Dip-Maschine', 'strength', '{trizeps,brust}'),
  (null, 'Landmine Press', 'strength', '{schultern,brust}'),
  (null, 'Schulterdrücken (Kurzhantel)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Maschine)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Smith-Maschine)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Langhantel, sitzend)', 'strength', '{schultern,trizeps}'),
  (null, 'Arnold Press', 'strength', '{schultern}'),
  (null, 'Push Press', 'strength', '{schultern,trizeps}'),
  (null, 'Seitheben (Maschine)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kabel)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, vorgebeugt)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Frontheben (Kurzhantel)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kabel)', 'strength', '{schultern}'),
  (null, 'Reverse Butterfly (Maschine)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Schulterheben (Kurzhantel)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Langhantel)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Maschine)', 'strength', '{oberer_ruecken}'),
  (null, 'Handstand-Liegestütze', 'strength', '{schultern,trizeps}'),
  (null, 'Klimmzüge (Untergriff)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (breiter Griff)', 'strength', '{lat}'),
  (null, 'Klimmzüge (neutraler Griff)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzug-Maschine (unterstützt)', 'strength', '{lat}'),
  (null, 'Latziehen (enger Griff)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (Untergriff)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (einarmig)', 'strength', '{lat}'),
  (null, 'Latziehen zum Nacken', 'strength', '{lat,schultern}'),
  (null, 'Geradarm-Latziehen (Kabel)', 'strength', '{lat}'),
  (null, 'Rudern (Maschine, Brustpolster)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (T-Stange)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Kurzhantelrudern (einarmig)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Rudern (Kurzhantel, Schrägbank)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Smith-Maschine)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Pendlay Row', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Kabelrudern (einarmig)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Kabelrudern (breiter Griff)', 'strength', '{oberer_ruecken}'),
  (null, 'Hyperextensions', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Maschine)', 'strength', '{unterer_ruecken}'),
  (null, 'Good Mornings', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Sumo-Kreuzheben', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Trap-Bar-Kreuzheben', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kreuzheben (Smith-Maschine)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rack Pull', 'strength', '{unterer_ruecken,oberer_ruecken}'),
  (null, 'Kurzhantel-Kreuzheben', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Superman', 'strength', '{unterer_ruecken}'),
  (null, 'Inverted Rows', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Face Pulls (Seil, hoch)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Bizepscurls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Maschine)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Maschine)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Langhantel)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kabel)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kabel, Seil)', 'strength', '{bizeps}'),
  (null, 'Konzentrationscurls', 'strength', '{bizeps}'),
  (null, 'Spider Curls', 'strength', '{bizeps}'),
  (null, 'Langhantel-Curls (enger Griff)', 'strength', '{bizeps}'),
  (null, 'Reverse Curls', 'strength', '{bizeps}'),
  (null, 'Zottman Curls', 'strength', '{bizeps}'),
  (null, 'Drag Curls', 'strength', '{bizeps}'),
  (null, 'Trizepsdrücken (Seil)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, Untergriff)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kurzhantel)', 'strength', '{trizeps}'),
  (null, 'Trizepsmaschine', 'strength', '{trizeps}'),
  (null, 'Enges Bankdrücken', 'strength', '{trizeps,brust}'),
  (null, 'French Press (Kurzhantel)', 'strength', '{trizeps}'),
  (null, 'French Press (Kabel)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks', 'strength', '{trizeps}'),
  (null, 'Bank-Dips', 'strength', '{trizeps}'),
  (null, 'Diamant-Liegestütze', 'strength', '{trizeps,brust}'),
  (null, 'Kniebeuge (Frontkniebeuge)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Smith-Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Kurzhantel, Goblet)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Hackenschmidt-Kniebeuge (Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Körpergewicht)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Kurzhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (rückwärts)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (seitlich)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Sissy Squat', 'strength', '{quadrizeps}'),
  (null, 'Beinpresse (liegend, 45°)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (sitzend)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (enge Fußstellung)', 'strength', '{quadrizeps}'),
  (null, 'Beinpresse (breite Fußstellung)', 'strength', '{gesaess,quadrizeps}'),
  (null, 'Beinstrecker (einbeinig)', 'strength', '{quadrizeps}'),
  (null, 'Beinbeuger (sitzend)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (liegend)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (stehend, einbeinig)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (Kabel)', 'strength', '{beinbeuger}'),
  (null, 'Nordic Curls', 'strength', '{beinbeuger}'),
  (null, 'Rumänisches Kreuzheben (Kurzhantel)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (Smith-Maschine)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Einbeiniges Kreuzheben', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Hip Thrust (Langhantel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Maschine)', 'strength', '{gesaess}'),
  (null, 'Hip Thrust (Smith-Maschine)', 'strength', '{gesaess}'),
  (null, 'Glute Bridge', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kabel-Kickbacks (Gesäß)', 'strength', '{gesaess}'),
  (null, 'Gesäßmaschine (Kickback)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Maschine)', 'strength', '{gesaess}'),
  (null, 'Adduktoren (Maschine)', 'strength', '{quadrizeps}'),
  (null, 'Seitliches Beinheben', 'strength', '{gesaess}'),
  (null, 'Wadenheben (sitzend)', 'strength', '{waden}'),
  (null, 'Wadenheben (Beinpresse)', 'strength', '{waden}'),
  (null, 'Wadenheben (Smith-Maschine)', 'strength', '{waden}'),
  (null, 'Wadenheben (Langhantel, stehend)', 'strength', '{waden}'),
  (null, 'Sprünge (Kniebeugesprung)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Box Jumps', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Wandsitzen', 'strength', '{quadrizeps}'),
  (null, 'Schlittenschieben', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Farmers Walk', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Beinheben (liegend)', 'strength', '{bauch}'),
  (null, 'Beinheben (hängend)', 'strength', '{bauch}'),
  (null, 'Knieheben (hängend)', 'strength', '{bauch}'),
  (null, 'Knieheben (Römischer Stuhl)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine', 'strength', '{bauch}'),
  (null, 'Cable Crunches (Kabel)', 'strength', '{bauch}'),
  (null, 'Sit-ups', 'strength', '{bauch}'),
  (null, 'Bicycle Crunches', 'strength', '{bauch}'),
  (null, 'Russian Twists', 'strength', '{bauch}'),
  (null, 'Mountain Climbers', 'strength', '{bauch,schultern}'),
  (null, 'Ab Wheel Rollout', 'strength', '{bauch}'),
  (null, 'Seitstütz', 'strength', '{bauch}'),
  (null, 'Pallof Press', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kabel)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers', 'strength', '{bauch}'),
  (null, 'Hollow Hold', 'strength', '{bauch}'),
  (null, 'Dead Bug', 'strength', '{bauch}'),
  (null, 'Bauchmuskeln (Schrägbank)', 'strength', '{bauch}'),
  (null, 'Toes to Bar', 'strength', '{bauch,lat}'),
  (null, 'Rückenstrecker (Boden)', 'strength', '{unterer_ruecken}'),
  (null, 'Kettlebell Swing', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Clean (Langhantel)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Burpees', 'strength', '{quadrizeps,brust}'),
  (null, 'Thruster', 'strength', '{quadrizeps,schultern}'),
  (null, 'Turkish Get-up', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes', 'strength', '{schultern,bauch}'),
  (null, 'Spinning', 'cardio', '{}'),
  (null, 'Radfahren (draußen)', 'cardio', '{}'),
  (null, 'Schwimmen', 'cardio', '{}'),
  (null, 'Seilspringen', 'cardio', '{}'),
  (null, 'Gehen (Spaziergang)', 'cardio', '{}'),
  (null, 'Treppensteigen', 'cardio', '{}'),
  (null, 'Ski-Ergometer', 'cardio', '{}'),
  (null, 'Air Bike (Assault Bike)', 'cardio', '{}'),
  (null, 'HIIT (Intervalltraining)', 'cardio', '{}'),
  (null, 'Boxen (Sandsack)', 'cardio', '{}'),
  (null, 'Elliptical-Stepper (Vario)', 'cardio', '{}'),
  (null, 'Floor Press (Langhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Reverse Grip)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Kabel, stehend)', 'strength', '{brust,trizeps}'),
  (null, 'Cable Crossover (Kabelzug, einarmig)', 'strength', '{brust}'),
  (null, 'Svend Press', 'strength', '{brust}'),
  (null, 'Liegestütze (Knie)', 'strength', '{brust,trizeps}'),
  (null, 'Archer-Liegestütze', 'strength', '{brust,trizeps}'),
  (null, 'Seitheben (Kurzhantel, sitzend)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kabel, einarmig, hinter dem Körper)', 'strength', '{schultern}'),
  (null, 'Frontheben (Scheibe)', 'strength', '{schultern}'),
  (null, 'Frontheben (Langhantel)', 'strength', '{schultern}'),
  (null, 'Z-Press', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kurzhantel, einarmig)', 'strength', '{schultern,trizeps}'),
  (null, 'Y-Heben', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Kabel-Schulterdrücken', 'strength', '{schultern,trizeps}'),
  (null, 'Meadows Row', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Seal Row', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Latziehen (kniend, einarmig, Kabel)', 'strength', '{lat}'),
  (null, 'Rudern (Maschine, einarmig)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Klimmzüge (gewichtet)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (Negativ)', 'strength', '{lat,bizeps}'),
  (null, 'Kabelrudern (Seil, zum Hals)', 'strength', '{oberer_ruecken,schultern}'),
  (null, 'Hyperextensions (gewichtet)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Reverse Hyperextension', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Good Mornings (sitzend)', 'strength', '{unterer_ruecken}'),
  (null, 'Bizepscurls (SZ-Stange)', 'strength', '{bizeps}'),
  (null, 'Cross-Body Hammercurls', 'strength', '{bizeps}'),
  (null, '21er Curls', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (SZ-Stange)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kabel, beidarmig, hoch)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Maschine, einarmig)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kurzhantel, Schrägbank)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kabel, liegend)', 'strength', '{bizeps}'),
  (null, 'Trizepsdrücken (V-Griff)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kabel)', 'strength', '{trizeps}'),
  (null, 'JM Press', 'strength', '{trizeps,brust}'),
  (null, 'Überkopf-Trizepsstrecken (Kurzhantel, einarmig)', 'strength', '{trizeps}'),
  (null, 'Tate Press', 'strength', '{trizeps}'),
  (null, 'Kniebeuge (Box Squat)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Zercher-Kniebeuge', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Pause)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Pistol Squat (unterstützt)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Langhantel, gehend)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Smith-Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Curtsy Lunge', 'strength', '{gesaess,quadrizeps}'),
  (null, 'Wadenheben (Esel)', 'strength', '{waden}'),
  (null, 'Wadenheben (Hackenschmidt-Maschine)', 'strength', '{waden}'),
  (null, 'Sumo-Kniebeuge (Kurzhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Seitliches Beinheben (Kabel)', 'strength', '{gesaess}'),
  (null, 'Frog Pumps', 'strength', '{gesaess}'),
  (null, 'Cable Pull-Through (Kabel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kniebeuge (Landmine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Wadenheben (einbeinig, Maschine)', 'strength', '{waden}'),
  (null, 'V-Ups', 'strength', '{bauch}'),
  (null, 'Flutter Kicks', 'strength', '{bauch}'),
  (null, 'Heel Taps', 'strength', '{bauch}'),
  (null, 'Reverse Crunch', 'strength', '{bauch}'),
  (null, 'Seitstütz mit Beinheben', 'strength', '{bauch,gesaess}'),
  (null, 'Bear Crawl', 'strength', '{bauch,schultern}'),
  (null, 'Hollow Rock', 'strength', '{bauch}'),
  (null, 'Bauchrolle (Kabel, kniend)', 'strength', '{bauch}'),
  (null, 'Kettlebell Snatch', 'strength', '{schultern,gesaess}'),
  (null, 'Kettlebell Clean & Press', 'strength', '{schultern,gesaess}'),
  (null, 'Medizinball Wandwurf', 'strength', '{quadrizeps,schultern}'),
  (null, 'Slam Ball', 'strength', '{schultern,bauch}'),
  (null, 'Suitcase Carry', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Schlittenziehen', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Reifen kippen', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Seilklettern', 'strength', '{lat,bizeps}'),
  (null, 'Trap-Bar-Schulterheben', 'strength', '{oberer_ruecken}'),
  (null, 'Joggen (Intervall)', 'cardio', '{}'),
  (null, 'Sprints', 'cardio', '{}'),
  (null, 'Berglauf', 'cardio', '{}'),
  (null, 'Treppenlauf (draußen)', 'cardio', '{}'),
  (null, 'Nordic Walking', 'cardio', '{}'),
  (null, 'Wandern (Berg)', 'cardio', '{}'),
  (null, 'Radfahren (Intervall)', 'cardio', '{}'),
  (null, 'Mountainbike', 'cardio', '{}'),
  (null, 'Rennrad', 'cardio', '{}'),
  (null, 'Rudergerät (Intervall)', 'cardio', '{}'),
  (null, 'Schwimmen (Kraul)', 'cardio', '{}'),
  (null, 'Schwimmen (Brust)', 'cardio', '{}'),
  (null, 'Aqua-Jogging', 'cardio', '{}'),
  (null, 'Feldhockey', 'cardio', '{}'),
  (null, 'Tennis', 'cardio', '{}'),
  (null, 'Fußball', 'cardio', '{}'),
  (null, 'Basketball', 'cardio', '{}'),
  (null, 'Handball', 'cardio', '{}'),
  (null, 'Volleyball', 'cardio', '{}'),
  (null, 'Badminton', 'cardio', '{}'),
  (null, 'Tischtennis', 'cardio', '{}'),
  (null, 'Squash', 'cardio', '{}'),
  (null, 'Klettern (Halle)', 'cardio', '{}'),
  (null, 'Kampfsport (Training)', 'cardio', '{}'),
  (null, 'Tanzen', 'cardio', '{}'),
  (null, 'Yoga', 'cardio', '{}'),
  (null, 'Pilates', 'cardio', '{}'),
  (null, 'Skifahren / Snowboard', 'cardio', '{}'),
  (null, 'Langlauf (Ski)', 'cardio', '{}'),
  (null, 'Inlineskaten', 'cardio', '{}'),
  (null, 'Eislaufen', 'cardio', '{}'),
  (null, 'Golf', 'cardio', '{}'),
  (null, 'Crosstrainer (Intervall)', 'cardio', '{}'),
  (null, 'Stepper (Intervall)', 'cardio', '{}'),
  (null, 'Bankdrücken (Kurzhantel, einarmig)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Widerstandsband)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Pause)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (breiter Griff)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Kabel)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Maschine, liegend)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Ketten)', 'strength', '{brust,trizeps}'),
  (null, 'Schrägbankdrücken (Kurzhantel, einarmig)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Widerstandsband)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Pause)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (enger Griff)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Kabel)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Kurzhantel, neutraler Griff)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Kurzhantel, Pause)', 'strength', '{brust,schultern}'),
  (null, 'Negativbankdrücken (Langhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Negativbankdrücken (Kurzhantel, einarmig)', 'strength', '{brust,trizeps}'),
  (null, 'Negativbankdrücken (Kabel)', 'strength', '{brust,trizeps}'),
  (null, 'Negativbankdrücken (Smith-Maschine)', 'strength', '{brust,trizeps}'),
  (null, 'Fliegende (Kurzhantel, Negativbank)', 'strength', '{brust}'),
  (null, 'Fliegende (Kurzhantel, langsam)', 'strength', '{brust}'),
  (null, 'Fliegende (Widerstandsband)', 'strength', '{brust}'),
  (null, 'Fliegende (Kabel, liegend)', 'strength', '{brust}'),
  (null, 'Fliegende (Kabel, sitzend)', 'strength', '{brust}'),
  (null, 'Butterfly (Maschine, Schrägbank)', 'strength', '{brust}'),
  (null, 'Brustpresse (Maschine, einarmig)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, Negativbank)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, langsam)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Kabel, einarmig)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Kabel, sitzend)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Widerstandsband, stehend)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, enger Griff)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (breiter Griff)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (enger Griff)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (Ringe)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Schlingentrainer)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (gewichtet)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Gewichtsweste)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (einarmig)', 'strength', '{brust,trizeps}'),
  (null, 'Dips (gewichtet)', 'strength', '{trizeps,brust}'),
  (null, 'Dips (Ringe)', 'strength', '{trizeps,brust}'),
  (null, 'Dips (Smith-Maschine)', 'strength', '{trizeps,brust}'),
  (null, 'Dips (Pause)', 'strength', '{trizeps,brust}'),
  (null, 'Dips (langsam)', 'strength', '{trizeps,brust}'),
  (null, 'Dips (Kettlebell)', 'strength', '{trizeps,brust}'),
  (null, 'Pullover (Kabel)', 'strength', '{lat,brust}'),
  (null, 'Pullover (Langhantel)', 'strength', '{brust,lat}'),
  (null, 'Pullover (Maschine)', 'strength', '{lat,brust}'),
  (null, 'Pullover (Kurzhantel, Bank)', 'strength', '{brust,lat}'),
  (null, 'Pullover (SZ-Stange)', 'strength', '{brust,lat}'),
  (null, 'Pullover (Kabel, einarmig)', 'strength', '{lat,brust}'),
  (null, 'Pullover (Kurzhantel, langsam)', 'strength', '{brust,lat}'),
  (null, 'Brustpresse (Landmine, einarmig)', 'strength', '{brust,schultern}'),
  (null, 'Brustpresse (Landmine, kniend)', 'strength', '{brust,schultern}'),
  (null, 'Bankdrücken (Kettlebell)', 'strength', '{brust,schultern}'),
  (null, 'Floor Press (Kettlebell)', 'strength', '{brust,schultern}'),
  (null, 'Brustpresse (Kabel, kniend)', 'strength', '{brust,trizeps}'),
  (null, 'Schulterdrücken (Kettlebell)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kettlebell, einarmig)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kettlebell, kniend)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kettlebell, wechselseitig)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kurzhantel, wechselseitig)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Kurzhantel, stehend)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Langhantel, stehend)', 'strength', '{schultern,trizeps}'),
  (null, 'Seitheben (Kurzhantel, stehend)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, liegend)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, einarmig)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, wechselseitig)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, langsam)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, Pause)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kabel, stehend)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kurzhantel, wechselseitig)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kurzhantel, beidarmig)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kabel, einarmig)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kabel, beidarmig)', 'strength', '{schultern}'),
  (null, 'Frontheben (Hantelscheibe, beidarmig)', 'strength', '{schultern}'),
  (null, 'Frontheben (Widerstandsband)', 'strength', '{schultern}'),
  (null, 'Frontheben (SZ-Stange)', 'strength', '{schultern}'),
  (null, 'Reverse Butterfly (Kabel, einarmig)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Kabel, beidarmig)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Kabel, sitzend)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Maschine, einarmig)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Kurzhantel, Schrägbank)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Kurzhantel, liegend)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (Kabel, einarmig)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (kniend)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (stehend)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (sitzend)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (Schlingentrainer)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (Seil, tief)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (Kurzhantel)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (Kabel)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (SZ-Stange)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (Smith-Maschine)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (Kettlebell)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Aufrechtes Rudern (enger Griff)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Schulterheben (Smith-Maschine)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Kabel)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Kettlebell)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Kurzhantel, Schrägbank)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Langhantel, hinter dem Rücken)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Widerstandsband)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterheben (Pause)', 'strength', '{oberer_ruecken}'),
  (null, 'Schulterkreisen (Kurzhantel, liegend, einarmig)', 'strength', '{schultern}'),
  (null, 'Schulterkreisen (Widerstandsband)', 'strength', '{schultern}'),
  (null, 'Schulterkreisen (Kabel, einarmig)', 'strength', '{schultern}'),
  (null, 'Schulterkreisen (Widerstandsband, einarmig, hoch)', 'strength', '{schultern}'),
  (null, 'Schulterkreisen (Kabel, tief)', 'strength', '{schultern}'),
  (null, 'Außenrotation (Kurzhantel, liegend)', 'strength', '{schultern}'),
  (null, 'Außenrotation (Kabel, stehend)', 'strength', '{schultern}'),
  (null, 'Außenrotation (Widerstandsband)', 'strength', '{schultern}'),
  (null, 'Außenrotation (Kurzhantel, stehend, einarmig)', 'strength', '{schultern}'),
  (null, 'Kabel-Y-Heben (Kabel)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Kabel-Y-Heben (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Kabel-Y-Heben (Kurzhantel, Bank)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Wall Slides (Körpergewicht)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Wall Slides (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Wall Slides (Boden)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Klimmzüge (Ringe)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (Schlingentrainer)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (Widerstandsband)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (Pause)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (langsam)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (explosiv)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (einarmig)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (breiter Griff)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (neutraler Griff)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (kniend)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (Widerstandsband)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (langsam)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (Pause)', 'strength', '{lat,bizeps}'),
  (null, 'Rudern (Langhantel, Pause)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Langhantel, langsam)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Langhantel, Untergriff)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Kurzhantel, beidarmig)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rückenstrecker (Maschine, gewichtet)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Bank, gewichtet)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Kabel)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (einbeinig)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Pause)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Hantelscheibe)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Rückenstrecker (Widerstandsband)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Kreuzheben (Smith-Maschine, Sumo)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (Sumo, Ketten)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (Sumo, Pause)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (erhöht)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (Pause)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (langsam)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (Kettlebell)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Rumänisches Kreuzheben (Kettlebell)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (einbeinig, Kurzhantel)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (einbeinig, Kettlebell)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (einbeinig, Langhantel)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (Pause)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (langsam)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (Kabel)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Good Mornings (Smith-Maschine)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (Widerstandsband)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (Pause)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (Kettlebell)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (langsam)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (Zercher)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Good Mornings (Kabel)', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Geradarm-Latziehen (Kabel, Seil)', 'strength', '{lat}'),
  (null, 'Pullover (Kurzhantel, Schrägbank)', 'strength', '{lat,brust}'),
  (null, 'Pullover (Kurzhantel, Boden)', 'strength', '{lat,brust}'),
  (null, 'Pullover (Kurzhantel, einarmig)', 'strength', '{lat,brust}'),
  (null, 'Skapula-Klimmzüge (Widerstandsband)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Skapula-Klimmzüge (Ringe)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rückenheben (Boden)', 'strength', '{oberer_ruecken,unterer_ruecken}'),
  (null, 'Rückenheben (Bank)', 'strength', '{oberer_ruecken,unterer_ruecken}'),
  (null, 'Rückenheben (Kurzhantel)', 'strength', '{oberer_ruecken,unterer_ruecken}'),
  (null, 'Rückenheben (Widerstandsband)', 'strength', '{oberer_ruecken,unterer_ruecken}'),
  (null, 'Rückenheben (Y-T-W)', 'strength', '{oberer_ruecken,unterer_ruecken}'),
  (null, 'Bizepscurls (Kurzhantel, sitzend)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kurzhantel, wechselseitig)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kurzhantel, einarmig)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kurzhantel, Schrägbank)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kurzhantel, langsam)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kurzhantel, sitzend)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kurzhantel, wechselseitig)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kurzhantel, einarmig)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kurzhantel, langsam)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kabel, Seil)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Kabel, einarmig)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Widerstandsband)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Kabel)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (SZ-Stange, enger Griff)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Maschine, einarmig)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Widerstandsband)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Langhantel, Untergriff)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Kurzhantel, neutraler Griff)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kabel, kniend)', 'strength', '{bizeps}'),
  (null, 'Reverse Curls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Reverse Curls (SZ-Stange)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Langhantel)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Kabel)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (SZ-Stange)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Langhantel, Obergriff)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Kurzhantel, Obergriff)', 'strength', '{bizeps}'),
  (null, 'Unterarmcurls (Kabel, Obergriff)', 'strength', '{bizeps}'),
  (null, 'Trizepsdrücken (Kabel, Stange)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, Seil, einarmig)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, SZ-Stange)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, Untergriff, einarmig)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, Obergriff, einarmig)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, kniend)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Kabel, vorgebeugt)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel, einarmig)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel, Seil)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel, kniend)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel, sitzend)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kurzhantel, sitzend)', 'strength', '{trizeps}'),
  (null, 'French Press (Langhantel)', 'strength', '{trizeps}'),
  (null, 'French Press (SZ-Stange, Schrägbank)', 'strength', '{trizeps}'),
  (null, 'French Press (SZ-Stange, Negativbank)', 'strength', '{trizeps}'),
  (null, 'French Press (Kurzhantel, einarmig)', 'strength', '{trizeps}'),
  (null, 'French Press (Widerstandsband)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kurzhantel, beidarmig)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kurzhantel, vorgebeugt)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kabel, beidarmig)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Widerstandsband)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kurzhantel, Schrägbank)', 'strength', '{trizeps}'),
  (null, 'Trizepsdips (Bank, einbeinig)', 'strength', '{trizeps}'),
  (null, 'Trizepsdips (Bank, gewichtet)', 'strength', '{trizeps}'),
  (null, 'Trizepsdips (Maschine, sitzend)', 'strength', '{trizeps}'),
  (null, 'Trizepsdips (Boden)', 'strength', '{trizeps}'),
  (null, 'Trizepsdips (Bank, Kettlebell)', 'strength', '{trizeps}'),
  (null, 'Enges Bankdrücken (Kurzhantel)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Smith-Maschine)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Pause)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Schrägbank)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Ketten)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Widerstandsband)', 'strength', '{trizeps,brust}'),
  (null, 'Enges Bankdrücken (Kabel)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, kniend)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, Schlingentrainer)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, Schrägbank)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, Ringe)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, gewichtet)', 'strength', '{trizeps,brust}'),
  (null, 'Liegestütze (enger Griff, SZ-Stange)', 'strength', '{trizeps,brust}'),
  (null, 'Trizeps-Extension (Schlingentrainer, liegend)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Extension (Ringe)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Extension (Boden, Körpergewicht)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Extension (Widerstandsband, liegend)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Extension (Maschine, einarmig)', 'strength', '{trizeps}'),
  (null, 'Kniebeuge (Langhantel, tief)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Langhantel, langsam)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Langhantel, Ketten)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Langhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Langhantel, rückwärts)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Langhantel, seitlich)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Kurzhantel, gehend)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Ausfallschritte (Kurzhantel, erhöht)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (Kurzhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (Langhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (Kettlebell)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (seitlich)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (Kurzhantel, seitlich)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Step-ups (Kurzhantel, hoch)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Kurzhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Langhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Smith-Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Kettlebell)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Kabel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Bulgarische Kniebeuge (Pause)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (sitzend, einbeinig)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (liegend, einbeinig)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (liegend, tief)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (liegend, hoch)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (liegend, Pause)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinpresse (liegend, langsam)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinstrecker (Widerstandsband)', 'strength', '{quadrizeps}'),
  (null, 'Beinstrecker (Kabel)', 'strength', '{quadrizeps}'),
  (null, 'Beinstrecker (sitzend, langsam)', 'strength', '{quadrizeps}'),
  (null, 'Beinstrecker (sitzend, Pause)', 'strength', '{quadrizeps}'),
  (null, 'Beinbeuger (sitzend, einbeinig)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (liegend, langsam)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (liegend, Pause)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (liegend, einbeinig)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (stehend, langsam)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (stehend, Kabel)', 'strength', '{beinbeuger}'),
  (null, 'Beinbeuger (stehend, Widerstandsband)', 'strength', '{beinbeuger}'),
  (null, 'Hip Thrust (Langhantel, Pause)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Langhantel, einbeinig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Kurzhantel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Kettlebell)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Widerstandsband)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Körpergewicht)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hip Thrust (Körpergewicht, einbeinig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Langhantel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Kurzhantel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (einbeinig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Widerstandsband)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Gymnastikball)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Gymnastikball, einbeinig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Glute Bridge (Pause)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kabel-Kickbacks (einbeinig)', 'strength', '{gesaess}'),
  (null, 'Kabel-Kickbacks (kniend)', 'strength', '{gesaess}'),
  (null, 'Kabel-Kickbacks (seitlich)', 'strength', '{gesaess}'),
  (null, 'Kabel-Kickbacks (Widerstandsband)', 'strength', '{gesaess}'),
  (null, 'Kabel-Kickbacks (liegend)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Kabel)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Widerstandsband, sitzend)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Widerstandsband, liegend)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Widerstandsband, stehend)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (Maschine, vorgebeugt)', 'strength', '{gesaess}'),
  (null, 'Abduktoren (liegend, Kurzhantel)', 'strength', '{gesaess}'),
  (null, 'Adduktoren (Kabel)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (Widerstandsband)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (liegend)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (stehend, Kabel)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (seitlich)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (Gymnastikball)', 'strength', '{quadrizeps}'),
  (null, 'Adduktoren (Maschine, Pause)', 'strength', '{quadrizeps}'),
  (null, 'Seitliches Beinheben (Widerstandsband)', 'strength', '{gesaess}'),
  (null, 'Seitliches Beinheben (liegend, gewichtet)', 'strength', '{gesaess}'),
  (null, 'Seitliches Beinheben (Maschine)', 'strength', '{gesaess}'),
  (null, 'Seitliches Beinheben (einbeinig, stehend)', 'strength', '{gesaess}'),
  (null, 'Seitliches Beinheben (Hantelscheibe)', 'strength', '{gesaess}'),
  (null, 'Clamshells (Widerstandsband)', 'strength', '{gesaess}'),
  (null, 'Clamshells (Körpergewicht)', 'strength', '{gesaess}'),
  (null, 'Clamshells (gewichtet)', 'strength', '{gesaess}'),
  (null, 'Clamshells (Pause)', 'strength', '{gesaess}'),
  (null, 'Clamshells (Kabel)', 'strength', '{gesaess}'),
  (null, 'Wadenheben (stehend, langsam)', 'strength', '{waden}'),
  (null, 'Wadenheben (stehend, Pause)', 'strength', '{waden}'),
  (null, 'Wadenheben (stehend, einbeinig, Körpergewicht)', 'strength', '{waden}'),
  (null, 'Wadenheben (stehend, Kurzhantel)', 'strength', '{waden}'),
  (null, 'Wadenheben (stehend, Kurzhantel, einbeinig)', 'strength', '{waden}'),
  (null, 'Wadenheben (sitzend, langsam)', 'strength', '{waden}'),
  (null, 'Wadenheben (sitzend, Pause)', 'strength', '{waden}'),
  (null, 'Tibialis-Heben (Körpergewicht)', 'strength', '{waden}'),
  (null, 'Tibialis-Heben (Widerstandsband)', 'strength', '{waden}'),
  (null, 'Tibialis-Heben (Maschine)', 'strength', '{waden}'),
  (null, 'Tibialis-Heben (Kabel)', 'strength', '{waden}'),
  (null, 'Tibialis-Heben (Wand)', 'strength', '{waden}'),
  (null, 'Sprünge (Körpergewicht, seitlich)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Körpergewicht, einbeinig)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Box, wechselseitig)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Körpergewicht, tief)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Kurzhantel, Kettlebell)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Körpergewicht, Strecksprung)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Sprünge (Körpergewicht, Hocksprung)', 'strength', '{quadrizeps,gesaess,waden}'),
  (null, 'Schlittenschieben (einarmig)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Schlittenschieben (rückwärts)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Schlittenschieben (Sprint)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Schlittenschieben (hohe Griffe)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Schlittenschieben (tiefe Griffe)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Wandsitzen (gewichtet)', 'strength', '{quadrizeps}'),
  (null, 'Wandsitzen (einbeinig)', 'strength', '{quadrizeps}'),
  (null, 'Wandsitzen (Gymnastikball)', 'strength', '{quadrizeps}'),
  (null, 'Wandsitzen (Pause)', 'strength', '{quadrizeps}'),
  (null, 'Beinschwünge (Kabel)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Beinschwünge (Körpergewicht, stehend)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Beinschwünge (seitlich, Körpergewicht)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Beinschwünge (Widerstandsband)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Beinschwünge (kniend)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Hüftbeuger (Kabel)', 'strength', '{quadrizeps}'),
  (null, 'Hüftbeuger (Maschine)', 'strength', '{quadrizeps}'),
  (null, 'Hüftbeuger (Widerstandsband)', 'strength', '{quadrizeps}'),
  (null, 'Hüftbeuger (liegend, Widerstandsband)', 'strength', '{quadrizeps}'),
  (null, 'Hüftbeuger (stehend, Kniehebe)', 'strength', '{quadrizeps}'),
  (null, 'Crunches (Kabel, stehend)', 'strength', '{bauch}'),
  (null, 'Crunches (Hantelscheibe)', 'strength', '{bauch}'),
  (null, 'Crunches (Medizinball)', 'strength', '{bauch}'),
  (null, 'Crunches (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Crunches (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Sit-ups (gewichtet)', 'strength', '{bauch}'),
  (null, 'Sit-ups (Schrägbank)', 'strength', '{bauch}'),
  (null, 'Sit-ups (Negativbank)', 'strength', '{bauch}'),
  (null, 'Sit-ups (Medizinball)', 'strength', '{bauch}'),
  (null, 'Sit-ups (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Sit-ups (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Sit-ups (explosiv)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, Medizinball)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, gewichtet)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, langsam)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, verkürzte Bewegung)', 'strength', '{bauch}'),
  (null, 'Beinheben (liegend, einbeinig)', 'strength', '{bauch}'),
  (null, 'Beinheben (hängend, einbeinig)', 'strength', '{bauch}'),
  (null, 'Knieheben (hängend, gewichtet)', 'strength', '{bauch}'),
  (null, 'Knieheben (hängend, seitlich)', 'strength', '{bauch}'),
  (null, 'Knieheben (hängend, langsam)', 'strength', '{bauch}'),
  (null, 'Knieheben (im Stütz, gewichtet)', 'strength', '{bauch}'),
  (null, 'Knieheben (liegend)', 'strength', '{bauch}'),
  (null, 'Knieheben (stehend, Kabel)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Medizinball)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Hantelscheibe)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Kurzhantel)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Kabel)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Russian Twists (Füße angehoben)', 'strength', '{bauch}'),
  (null, 'Russian Twists (gewichtet)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Maschine)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Maschine, gewichtet)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Kabel, stehend)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Kabel, kniend)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Kabel, sitzend)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Widerstandsband, stehend)', 'strength', '{bauch}'),
  (null, 'Rumpfdrehen (Widerstandsband, kniend)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kabel, hoch)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kabel, tief)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kabel, kniend)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Medizinball)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kurzhantel)', 'strength', '{bauch}'),
  (null, 'Woodchopper (Kabel, einbeinig)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, kniend)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, stehend)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, sitzend)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, Pause)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, einbeinig)', 'strength', '{bauch}'),
  (null, 'Pallof Press (Kabel, breiter Griff)', 'strength', '{bauch}'),
  (null, 'Plank (hoch)', 'strength', '{bauch}'),
  (null, 'Plank (gewichtet)', 'strength', '{bauch}'),
  (null, 'Plank (Arm heben)', 'strength', '{bauch}'),
  (null, 'Plank (Bein heben)', 'strength', '{bauch}'),
  (null, 'Plank (Ringe)', 'strength', '{bauch}'),
  (null, 'Plank (Schlingentrainer)', 'strength', '{bauch}'),
  (null, 'Seitstütz (hoch)', 'strength', '{bauch}'),
  (null, 'Seitstütz (gewichtet)', 'strength', '{bauch}'),
  (null, 'Seitstütz (Knie)', 'strength', '{bauch}'),
  (null, 'Seitstütz (Bein heben)', 'strength', '{bauch}'),
  (null, 'Seitstütz (Ringe)', 'strength', '{bauch}'),
  (null, 'Seitstütz (Schlingentrainer)', 'strength', '{bauch}'),
  (null, 'Seitstütz (Hüftheben)', 'strength', '{bauch}'),
  (null, 'Bauchrad (stehend)', 'strength', '{bauch}'),
  (null, 'Bauchrad (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Bauchrad (einarmig)', 'strength', '{bauch}'),
  (null, 'Bauchrad (Ringe)', 'strength', '{bauch}'),
  (null, 'Bauchrad (Schlingentrainer)', 'strength', '{bauch}'),
  (null, 'Bauchrad (Kabel)', 'strength', '{bauch}'),
  (null, 'Bauchrad (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Mountain Climbers (Gleitscheiben)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (langsam)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (überkreuz)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (gewichtet)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (Ringe)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (Schlingentrainer)', 'strength', '{bauch,schultern}'),
  (null, 'Mountain Climbers (Bank)', 'strength', '{bauch,schultern}'),
  (null, 'Hollow Hold (Arm heben)', 'strength', '{bauch}'),
  (null, 'Hollow Hold (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Hollow Hold (gewichtet)', 'strength', '{bauch}'),
  (null, 'Hollow Hold (Pause)', 'strength', '{bauch}'),
  (null, 'Hollow Hold (verkürzte Bewegung)', 'strength', '{bauch}'),
  (null, 'Hollow Hold (Medizinball)', 'strength', '{bauch}'),
  (null, 'Dead Bug (gewichtet)', 'strength', '{bauch}'),
  (null, 'Dead Bug (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Dead Bug (Kabel)', 'strength', '{bauch}'),
  (null, 'Dead Bug (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Dead Bug (langsam)', 'strength', '{bauch}'),
  (null, 'Dead Bug (Medizinball)', 'strength', '{bauch}'),
  (null, 'Dead Bug (Kurzhantel)', 'strength', '{bauch}'),
  (null, 'Bird Dog (Körpergewicht)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (Widerstandsband)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (Kabel)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (gewichtet)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (langsam)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (Pause)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Bird Dog (Gymnastikball)', 'strength', '{bauch,unterer_ruecken}'),
  (null, 'Windshield Wipers (hängend)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (Boden)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (gewichtet)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (Widerstandsband)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (Ringe)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (Knie)', 'strength', '{bauch}'),
  (null, 'Windshield Wipers (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Cable Crunches (sitzend)', 'strength', '{bauch}'),
  (null, 'Cable Crunches (liegend)', 'strength', '{bauch}'),
  (null, 'Cable Crunches (Stange)', 'strength', '{bauch}'),
  (null, 'Cable Crunches (mit Drehung)', 'strength', '{bauch}'),
  (null, 'Cable Crunches (seitlich)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (sitzend)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (gewichtet)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (mit Drehung)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (einarmig)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (seitlich)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (liegend)', 'strength', '{bauch}'),
  (null, 'Bauchmaschine (langsam)', 'strength', '{bauch}'),
  (null, 'Superman (Bank)', 'strength', '{unterer_ruecken}'),
  (null, 'Superman (Gymnastikball)', 'strength', '{unterer_ruecken}'),
  (null, 'Superman (Widerstandsband)', 'strength', '{unterer_ruecken}'),
  (null, 'Superman (gewichtet)', 'strength', '{unterer_ruecken}'),
  (null, 'Superman (Arm heben)', 'strength', '{unterer_ruecken}'),
  (null, 'Superman (Schwimmer)', 'strength', '{unterer_ruecken}'),
  (null, 'Hyperextensions (Schrägbank)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Hyperextensions (einbeinig)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Hyperextensions (Kurzhantel)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Hyperextensions (Maschine, sitzend)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Hyperextensions (gewichtet, Pause)', 'strength', '{unterer_ruecken,gesaess}'),
  (null, 'Toes to Bar (gewichtet)', 'strength', '{bauch,lat}'),
  (null, 'Toes to Bar (langsam)', 'strength', '{bauch,lat}'),
  (null, 'Toes to Bar (Ringe)', 'strength', '{bauch,lat}'),
  (null, 'Toes to Bar (einarmig)', 'strength', '{bauch,lat}'),
  (null, 'Toes to Bar (Kipping)', 'strength', '{bauch,lat}'),
  (null, 'Toes to Bar (seitlich)', 'strength', '{bauch,lat}'),
  (null, 'Kettlebell Swing (einarmig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kettlebell Swing (wechselseitig)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kettlebell Swing (amerikanisch)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kettlebell Clean (einarmig)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (beidarmig)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (Press, einarmig)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (Squat)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (Hang)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (wechselseitig)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Clean (einbeinig)', 'strength', '{gesaess,oberer_ruecken}'),
  (null, 'Kettlebell Windmill', 'strength', '{bauch,schultern}'),
  (null, 'Kettlebell Windmill (Widerstandsband)', 'strength', '{bauch,schultern}'),
  (null, 'Kettlebell Windmill (Kurzhantel)', 'strength', '{bauch,schultern}'),
  (null, 'Kettlebell Windmill (doppelt)', 'strength', '{bauch,schultern}'),
  (null, 'Kettlebell Windmill (Bottoms-up)', 'strength', '{bauch,schultern}'),
  (null, 'Farmers Walk (Kettlebell)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Farmers Walk (Trap-Bar)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Farmers Walk (einarmig)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Koffer, Kettlebell)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Rack, Kettlebell)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Rack, Kurzhantel)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Überkopf, Kettlebell)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Überkopf, Kurzhantel)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Tragen (Kellner, Kettlebell)', 'strength', '{bauch,oberer_ruecken}'),
  (null, 'Sandsack-Training (Kniebeuge)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (auf die Schulter)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (Clean)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (Ausfallschritt)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (Wurf)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (Rudern)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Sandsack-Training (Press)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Medizinball-Wurf (Brustpass)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (über Kopf)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (seitlich)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (mit Rotation)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (Boden)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (Wand)', 'strength', '{schultern,bauch}'),
  (null, 'Medizinball-Wurf (einbeinig)', 'strength', '{schultern,bauch}'),
  (null, 'Burpees (mit Liegestütz)', 'strength', '{quadrizeps,brust}'),
  (null, 'Burpees (Box)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Burpees (Sprung)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Burpees (einarmig)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Burpees (Widerstandsband)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Burpees (gewichtet)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Burpees (Ringe)', 'strength', '{quadrizeps,bauch}'),
  (null, 'Thruster (Kurzhantel)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (Kettlebell)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (Langhantel, Front)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (Smith-Maschine)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (einarmig, Kurzhantel)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (einarmig, Kettlebell)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Thruster (Widerstandsband)', 'strength', '{quadrizeps,schultern}'),
  (null, 'Turkish Get-up (Kettlebell)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (Kurzhantel)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (Schuh auf der Faust)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (Körpergewicht)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (Widerstandsband)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (langsam)', 'strength', '{schultern,bauch}'),
  (null, 'Turkish Get-up (schwer)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (Wellen)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (Slam)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (seitlich)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (Kreise)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (wechselseitig)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (beidarmig)', 'strength', '{schultern,bauch}'),
  (null, 'Battle Ropes (kniend)', 'strength', '{schultern,bauch}'),
  (null, 'Clean (Langhantel, Hang)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Langhantel, Power)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Kurzhantel, Hang)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Kurzhantel, einarmig)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Kettlebell, einarmig)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Langhantel, Blöcke)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Clean (Langhantel, Squat)', 'strength', '{quadrizeps,gesaess,oberer_ruecken}'),
  (null, 'Snatch (Langhantel, Power)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Langhantel, Hang)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Kurzhantel, einarmig)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Kurzhantel, einarmig, Hang)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Kettlebell, einarmig)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Langhantel, Squat)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Snatch (Langhantel, Blöcke)', 'strength', '{schultern,gesaess,quadrizeps}'),
  (null, 'Jerk (Langhantel)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Jerk (Langhantel, Ausfallschritt)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Jerk (Langhantel, Blöcke)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Jerk (Kurzhantel, einarmig)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Jerk (Kettlebell, einarmig)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Jerk (Kurzhantel)', 'strength', '{schultern,trizeps,quadrizeps}'),
  (null, 'Landmine (Press, einarmig)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (Rudern, einarmig)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (Squat)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (mit Rotation)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (Ausfallschritt)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (Rumänisches Kreuzheben, einarmig)', 'strength', '{schultern,bauch}'),
  (null, 'Landmine (Press, kniend)', 'strength', '{schultern,bauch}'),
  (null, 'Handstand (Halten)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (Wand)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (Fußkontakt, Wand)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (mit Liegestütz, Wand)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (mit Liegestütz, Pike)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (gehend)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Handstand (Kick-up)', 'strength', '{schultern,trizeps,bauch}'),
  (null, 'Muscle-up (Ringe)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (Stange)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (strikt)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (Kipping)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (Negativbank)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (Widerstandsband)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Muscle-up (schräg)', 'strength', '{lat,trizeps,brust}'),
  (null, 'Calisthenics (Front Lever)', 'strength', '{lat,bauch}'),
  (null, 'Calisthenics (Back Lever)', 'strength', '{lat,schultern,bauch}'),
  (null, 'Calisthenics (Planche)', 'strength', '{schultern,brust,bauch}'),
  (null, 'Calisthenics (L-Sit)', 'strength', '{bauch}'),
  (null, 'Calisthenics (V-Sit)', 'strength', '{bauch}'),
  (null, 'Calisthenics (Human Flag)', 'strength', '{bauch,lat,schultern}'),
  (null, 'Calisthenics (Dragon Flag)', 'strength', '{bauch}'),
  (null, 'Isometrie (Wandsitzen)', 'strength', '{quadrizeps,bauch,brust}'),
  (null, 'Isometrie (Brust drücken)', 'strength', '{brust,trizeps}'),
  (null, 'Isometrie (Plank)', 'strength', '{bauch}'),
  (null, 'Isometrie (Glute Bridge)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Isometrie (Hollow)', 'strength', '{bauch}'),
  (null, 'Isometrie (Split Squat)', 'strength', '{quadrizeps,bauch,brust}'),
  (null, 'Laufband (Steigung)', 'cardio', '{}'),
  (null, 'Laufband (Intervall)', 'cardio', '{}'),
  (null, 'Laufband (Gehen)', 'cardio', '{}'),
  (null, 'Laufband (Sprint)', 'cardio', '{}'),
  (null, 'Joggen (lockerer Dauerlauf)', 'cardio', '{}'),
  (null, 'Langer Lauf', 'cardio', '{}'),
  (null, 'Tempolauf', 'cardio', '{}'),
  (null, 'Intervalllauf (Bahn)', 'cardio', '{}'),
  (null, 'Trailrunning', 'cardio', '{}'),
  (null, 'Rückwärtslaufen', 'cardio', '{}'),
  (null, 'Crosstrainer (rückwärts)', 'cardio', '{}'),
  (null, 'Crosstrainer (Steigung)', 'cardio', '{}'),
  (null, 'Fahrradergometer (Intervall)', 'cardio', '{}'),
  (null, 'Fahrradergometer (Grundlage)', 'cardio', '{}'),
  (null, 'Liegeergometer', 'cardio', '{}'),
  (null, 'Handkurbel-Ergometer', 'cardio', '{}'),
  (null, 'Rudergerät (Ausdauer)', 'cardio', '{}'),
  (null, 'Rudergerät (2000 m)', 'cardio', '{}'),
  (null, 'Ski-Ergometer (Intervall)', 'cardio', '{}'),
  (null, 'Treppenmaschine', 'cardio', '{}'),
  (null, 'Seilspringen (Intervall)', 'cardio', '{}'),
  (null, 'Seilspringen (Doppelsprung)', 'cardio', '{}'),
  (null, 'Seilspringen (einbeinig)', 'cardio', '{}'),
  (null, 'Jumping Jacks', 'cardio', '{}'),
  (null, 'High Knees', 'cardio', '{}'),
  (null, 'Butt Kicks', 'cardio', '{}'),
  (null, 'Skater Jumps', 'cardio', '{}'),
  (null, 'Shadow Boxing', 'cardio', '{}'),
  (null, 'Boxen (Pratzen)', 'cardio', '{}'),
  (null, 'Fitnessboxen', 'cardio', '{}'),
  (null, 'Kickboxen', 'cardio', '{}'),
  (null, 'Aerobic', 'cardio', '{}'),
  (null, 'Step Aerobic', 'cardio', '{}'),
  (null, 'Zumba', 'cardio', '{}'),
  (null, 'Bodypump', 'cardio', '{}'),
  (null, 'Bodycombat', 'cardio', '{}'),
  (null, 'Spinning (HIIT)', 'cardio', '{}'),
  (null, 'Zirkeltraining', 'cardio', '{}'),
  (null, 'CrossFit (WOD)', 'cardio', '{}'),
  (null, 'Tabata', 'cardio', '{}'),
  (null, 'Bootcamp', 'cardio', '{}'),
  (null, 'Parkour', 'cardio', '{}'),
  (null, 'Calisthenics (Training)', 'cardio', '{}'),
  (null, 'Bouldern (Halle)', 'cardio', '{}'),
  (null, 'Klettern (Seil, Halle)', 'cardio', '{}'),
  (null, 'Kajak', 'cardio', '{}'),
  (null, 'Kanu', 'cardio', '{}'),
  (null, 'Stand-up-Paddling', 'cardio', '{}'),
  (null, 'Rudern (Boot)', 'cardio', '{}'),
  (null, 'Segeln', 'cardio', '{}'),
  (null, 'Surfen', 'cardio', '{}'),
  (null, 'Reiten', 'cardio', '{}'),
  (null, 'Eishockey', 'cardio', '{}'),
  (null, 'Rugby', 'cardio', '{}'),
  (null, 'American Football', 'cardio', '{}'),
  (null, 'Baseball', 'cardio', '{}'),
  (null, 'Cricket', 'cardio', '{}'),
  (null, 'Padel', 'cardio', '{}'),
  (null, 'Pickleball', 'cardio', '{}'),
  (null, 'Ultimate Frisbee', 'cardio', '{}'),
  (null, 'Judo', 'cardio', '{}'),
  (null, 'Karate', 'cardio', '{}'),
  (null, 'Taekwondo', 'cardio', '{}'),
  (null, 'Brazilian Jiu-Jitsu', 'cardio', '{}'),
  (null, 'Ringen', 'cardio', '{}'),
  (null, 'Muay Thai', 'cardio', '{}'),
  (null, 'Krav Maga', 'cardio', '{}'),
  (null, 'Stretching', 'cardio', '{}'),
  (null, 'Mobility (Beweglichkeit)', 'cardio', '{}'),
  (null, 'Faszientraining', 'cardio', '{}'),
  (null, 'Yoga (Power)', 'cardio', '{}'),
  (null, 'Yoga (Yin)', 'cardio', '{}'),
  (null, 'Tai Chi', 'cardio', '{}'),
  (null, 'Wandern (flach)', 'cardio', '{}'),
  (null, 'Spazierengehen mit Hund', 'cardio', '{}'),
  (null, 'Treppensteigen (Alltag)', 'cardio', '{}'),
  (null, 'Gartenarbeit', 'cardio', '{}'),
  (null, 'Radfahren (Pendeln)', 'cardio', '{}'),
  (null, 'E-Bike', 'cardio', '{}'),
  (null, 'Schwimmen (Rücken)', 'cardio', '{}'),
  (null, 'Schwimmen (Schmetterling)', 'cardio', '{}'),
  (null, 'Schwimmen (Intervall)', 'cardio', '{}'),
  (null, 'Aquafitness', 'cardio', '{}'),
  (null, 'Skifahren (Abfahrt)', 'cardio', '{}'),
  (null, 'Snowboarden', 'cardio', '{}'),
  (null, 'Skitour', 'cardio', '{}'),
  (null, 'Schlittschuhlaufen', 'cardio', '{}'),
  (null, 'Rollerskaten', 'cardio', '{}'),
  (null, 'Skateboarden', 'cardio', '{}'),
  (null, 'Tennis (Training)', 'cardio', '{}'),
  (null, 'Fußball (Training)', 'cardio', '{}'),
  (null, 'Beachvolleyball', 'cardio', '{}'),
  (null, 'Handball (Training)', 'cardio', '{}'),
  (null, 'Basketball (Training)', 'cardio', '{}'),
  (null, 'Frisbee Golf', 'cardio', '{}'),
  (null, 'Minigolf', 'cardio', '{}'),
  (null, 'Bowling', 'cardio', '{}'),
  (null, 'Tanzen (Gesellschaftstanz)', 'cardio', '{}'),
  (null, 'Tanzen (Hip-Hop)', 'cardio', '{}'),
  (null, 'Reverse Kabel-Crossover (über Kreuz)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Kabelzug (einarmig, über Kreuz)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Fly (Kurzhantel, sitzend vorgebeugt)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Fly (Kurzhantel, stehend vorgebeugt)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Fly (Kurzhantel, Brust auf Schrägbank)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Kabel, Schrägbank)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Hintere-Schulter-Rudern (Kurzhantel)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Hintere-Schulter-Rudern (Kabel)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Hintere-Schulter-Rudern (Maschine)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Band Pull-Apart (Widerstandsband)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Face Pulls (mit Außenrotation)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Y-T-W-Heben (Kurzhantel, Schrägbank)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Reverse Butterfly (Maschine, neutraler Griff)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Seitheben (Kabel, Lean-away)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, angelehnt)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kurzhantel, Brust auf Schrägbank)', 'strength', '{schultern}'),
  (null, 'Seitheben (Teilwiederholungen)', 'strength', '{schultern}'),
  (null, 'Seitheben (Widerstandsband)', 'strength', '{schultern}'),
  (null, 'Seitheben (Maschine, einarmig)', 'strength', '{schultern}'),
  (null, 'Seitheben (Kabel, beidarmig über Kreuz)', 'strength', '{schultern}'),
  (null, 'Lu Raises (Hantelscheibe)', 'strength', '{schultern}'),
  (null, 'Aufrechtes Rudern (breiter Griff)', 'strength', '{schultern,oberer_ruecken}'),
  (null, 'Schulterdrücken (Kurzhantel, neutraler Griff)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Plattengerät)', 'strength', '{schultern,trizeps}'),
  (null, 'Schulterdrücken (Widerstandsband)', 'strength', '{schultern,trizeps}'),
  (null, 'Bradford Press (Langhantel)', 'strength', '{schultern,trizeps}'),
  (null, 'Nackendrücken (Langhantel)', 'strength', '{schultern,trizeps}'),
  (null, 'Viking Press (Maschine)', 'strength', '{schultern,trizeps}'),
  (null, 'Cuban Press (Kurzhantel)', 'strength', '{schultern}'),
  (null, 'Pike-Liegestütze', 'strength', '{schultern,trizeps}'),
  (null, 'Pike-Liegestütze (Füße erhöht)', 'strength', '{schultern,trizeps}'),
  (null, 'Frontheben (Kurzhantel, Schrägbank)', 'strength', '{schultern}'),
  (null, 'Frontheben (Kabel, Seil)', 'strength', '{schultern}'),
  (null, 'Halo (Hantelscheibe)', 'strength', '{schultern,bauch}'),
  (null, 'Innenrotation (Kabel, stehend)', 'strength', '{schultern}'),
  (null, 'Außenrotation (Kabel, 90 Grad)', 'strength', '{schultern}'),
  (null, 'Schulterdurchzug (Stab oder Band)', 'strength', '{schultern}'),
  (null, 'Skapula-Liegestütze', 'strength', '{schultern,brust}'),
  (null, 'Skapula-Klimmzüge', 'strength', '{schultern,lat}'),
  (null, 'Bankdrücken (Plattengerät)', 'strength', '{brust,trizeps}'),
  (null, 'Schrägbankdrücken (Plattengerät)', 'strength', '{brust,schultern}'),
  (null, 'Brustpresse (Plattengerät, Negativbank)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, konvergierend)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Maschine, Schrägbank, einarmig)', 'strength', '{brust,schultern}'),
  (null, 'Schrägbankdrücken (Kurzhantel, flach geneigt)', 'strength', '{brust,schultern}'),
  (null, 'Bankdrücken (Kurzhantel, neutraler Griff)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Kurzhantel, Pause)', 'strength', '{brust,trizeps}'),
  (null, 'Bankdrücken (Kurzhantel, Gymnastikball)', 'strength', '{brust,bauch}'),
  (null, 'Squeeze Press (Kurzhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Spoto Press (Langhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Larsen Press (Langhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Board Press (Langhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Guillotine Press (Langhantel)', 'strength', '{brust,schultern}'),
  (null, 'Bankdrücken (Multigriffstange)', 'strength', '{brust,trizeps}'),
  (null, 'Floor Press (Kurzhantel)', 'strength', '{brust,trizeps}'),
  (null, 'Brustpresse (Landmine, beidarmig)', 'strength', '{brust,schultern}'),
  (null, 'Fliegende (Kabel, Schrägbank)', 'strength', '{brust}'),
  (null, 'Cable Crossover (Kabelzug, kniend)', 'strength', '{brust}'),
  (null, 'Butterfly (Maschine, einarmig)', 'strength', '{brust}'),
  (null, 'Fliegende (Kurzhantel, mit Drücken)', 'strength', '{brust,trizeps}'),
  (null, 'Fliegende (Ringe)', 'strength', '{brust,schultern}'),
  (null, 'Fliegende (Schlingentrainer)', 'strength', '{brust,schultern}'),
  (null, 'Liegestütze (Hände erhöht)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Deficit)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Klatsch)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Pause)', 'strength', '{brust,trizeps}'),
  (null, 'Liegestütze (Widerstandsband)', 'strength', '{brust,trizeps}'),
  (null, 'Pseudo-Planche-Liegestütze', 'strength', '{brust,schultern}'),
  (null, 'Rudern (Plattengerät, hoch)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Plattengerät, tief)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Latziehen (Plattengerät)', 'strength', '{lat,bizeps}'),
  (null, 'Rudern (T-Stange, Brustpolster)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Maschine, breiter Griff)', 'strength', '{oberer_ruecken,schultern}'),
  (null, 'Rudern (Maschine, Untergriff)', 'strength', '{lat,bizeps}'),
  (null, 'Kabelrudern (stehend)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Kabelrudern (kniend, einarmig)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Kabelrudern (Untergriff)', 'strength', '{lat,bizeps}'),
  (null, 'Kroc Rows (Kurzhantel)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Yates Row (Langhantel)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Helms Row (Kurzhantel)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Kettlebell, einarmig)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Gorilla Rows (Kettlebell)', 'strength', '{lat,oberer_ruecken}'),
  (null, 'Renegade Rows (Kurzhantel)', 'strength', '{oberer_ruecken,bauch}'),
  (null, 'Rudern (Widerstandsband)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Rudern (Schlingentrainer)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Inverted Rows (Ringe)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Inverted Rows (Füße erhöht)', 'strength', '{oberer_ruecken,lat}'),
  (null, 'Klimmzüge (Kommando)', 'strength', '{lat,bizeps}'),
  (null, 'Klimmzüge (L-Sit)', 'strength', '{lat,bauch}'),
  (null, 'Klimmzüge (Archer)', 'strength', '{lat,bizeps}'),
  (null, 'Latziehen (Seil)', 'strength', '{lat}'),
  (null, 'Kelso Shrugs (Kurzhantel)', 'strength', '{oberer_ruecken}'),
  (null, 'Kreuzheben (Defizit)', 'strength', '{unterer_ruecken,gesaess,beinbeuger}'),
  (null, 'Kreuzheben (Snatch-Griff)', 'strength', '{unterer_ruecken,oberer_ruecken,gesaess}'),
  (null, 'Jefferson Curl', 'strength', '{unterer_ruecken,beinbeuger}'),
  (null, 'Bayesian Curls (Kabel)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Widerstandsband)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kettlebell)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Schlingentrainer)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Plattengerät)', 'strength', '{bizeps}'),
  (null, 'Bizepscurls (Kurzhantel, Pause)', 'strength', '{bizeps}'),
  (null, 'Waiter Curls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Pinwheel Curls (Kurzhantel)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Multigriffstange)', 'strength', '{bizeps}'),
  (null, 'Hammercurls (Scott-Bank)', 'strength', '{bizeps}'),
  (null, 'Scott-Curls (Kabel, einarmig)', 'strength', '{bizeps}'),
  (null, 'Reverse Curls (Kabel)', 'strength', '{bizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Kabel, über Kreuz)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (Maschine)', 'strength', '{trizeps}'),
  (null, 'Überkopf-Trizepsstrecken (SZ-Stange)', 'strength', '{trizeps}'),
  (null, 'JM Press (Smith-Maschine)', 'strength', '{trizeps,brust}'),
  (null, 'French Press (Kurzhantel, rollend)', 'strength', '{trizeps}'),
  (null, 'Trizepsdrücken (Widerstandsband)', 'strength', '{trizeps}'),
  (null, 'Trizeps-Kickbacks (Kabel, Seil)', 'strength', '{trizeps}'),
  (null, 'Dips (Maschine, unterstützt)', 'strength', '{trizeps,brust}'),
  (null, 'Unterarmroller', 'strength', '{bizeps}'),
  (null, 'Pinch Grip (Hantelscheiben)', 'strength', '{bizeps}'),
  (null, 'Hängen (Klimmzugstange)', 'strength', '{bizeps,lat}'),
  (null, 'Pendulum Squat (Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Belt Squat (Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'V-Squat (Maschine)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Hackenschmidt-Kniebeuge (umgekehrt)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kniebeuge (Safety-Bar)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Kniebeuge (Kurzhantel, Fersen erhöht)', 'strength', '{quadrizeps}'),
  (null, 'Spanish Squat (Widerstandsband)', 'strength', '{quadrizeps}'),
  (null, 'Ausfallschritte (Defizit)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Reverse Nordic', 'strength', '{quadrizeps}'),
  (null, 'Step-down (Kurzhantel)', 'strength', '{quadrizeps,gesaess}'),
  (null, 'Beinbeuger (Kurzhantel, liegend)', 'strength', '{beinbeuger}'),
  (null, 'Glute Ham Raise', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Beinbeuger (Gymnastikball)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Beinbeuger (Gleitscheiben)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (B-Stance)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Rumänisches Kreuzheben (Trap-Bar)', 'strength', '{beinbeuger,gesaess}'),
  (null, 'Hip Thrust (Plattengerät)', 'strength', '{gesaess,beinbeuger}'),
  (null, 'Kickback (Smith-Maschine)', 'strength', '{gesaess}'),
  (null, 'Wadenheben (Plattengerät)', 'strength', '{waden}'),
  (null, 'Wadenheben (sitzend, Kurzhantel)', 'strength', '{waden}'),
  (null, 'Wadenheben (Treppe, einbeinig)', 'strength', '{waden}'),
  (null, 'Crunches (Negativbank)', 'strength', '{bauch}'),
  (null, 'Jackknife Sit-ups', 'strength', '{bauch}'),
  (null, 'Stir the Pot (Gymnastikball)', 'strength', '{bauch}'),
  (null, 'Copenhagen Plank', 'strength', '{bauch,quadrizeps}'),
  (null, 'Body Saw (Gleitscheiben)', 'strength', '{bauch}'),
  (null, 'Plank (Schulter tippen)', 'strength', '{bauch,schultern}'),
  (null, 'Toe Touches (Crunch)', 'strength', '{bauch}')
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
-- Der erste (älteste) Admin ist der Besitzer: Nur er sieht das Admin-Menü, besitzt alle Shop-Artikel,
-- kann eigene Farbschemata entwerfen und im Shop anbieten, Meldungen bearbeiten und weitere Admins verwalten.
-- Weitere Admins haben alles aus Pro und Essen+ (my_pro, has_pro), aber kein Admin-Menü und keine Admin-Werkzeuge.
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

-- Besitzer: verwaltet die Admins (nur er darf Admins hinzufügen/entfernen).
-- Gibt es noch keinen Besitzer, wird der älteste Admin Besitzer. Bewusst festlegen (SQL Editor):
--   update public.admins set is_owner = (user_id = (select id from auth.users where email = 'DEINE@EMAIL'));
alter table public.admins add column if not exists is_owner boolean not null default false;
update public.admins set is_owner = true
where user_id = (select a.user_id from public.admins a order by a.created_at, a.user_id limit 1)
  and not exists (select 1 from public.admins o where o.is_owner);

create or replace function public.is_owner(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  -- Ist (noch) niemand als Besitzer markiert, gilt der älteste Admin als Besitzer (z. B. frisch per SQL eingetragen).
  select p_user is not null and exists (
    select 1 from public.admins a where a.user_id = p_user and (a.is_owner or (
      not exists (select 1 from public.admins o where o.is_owner)
      and a.user_id = (select f.user_id from public.admins f order by f.created_at, f.user_id limit 1))))
$$;

-- Alle Admins (nur für den Besitzer)
create or replace function public.admin_list()
returns table (user_id uuid, display_name text, email text, since timestamptz, is_owner boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Admins verwalten.'; end if;
  return query
    select a.user_id, p.display_name, u.email::text, a.created_at, a.is_owner
    from public.admins a
    join auth.users u on u.id = a.user_id
    left join public.profiles p on p.id = a.user_id
    order by a.is_owner desc, a.created_at;
end;
$$;

-- Admin hinzufügen per E-Mail oder Freundescode (nur Besitzer)
create or replace function public.admin_add(p_who text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  who text := btrim(coalesce(p_who, ''));
  target uuid;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Admins verwalten.'; end if;
  if who = '' then raise exception 'Bitte E-Mail oder Freundescode eingeben.'; end if;
  if position('@' in who) > 0 then
    select u.id into target from auth.users u where lower(u.email) = lower(who);
    if target is null then raise exception 'Kein Konto mit dieser E-Mail gefunden.'; end if;
  else
    select p.id into target from public.profiles p where p.friend_code = upper(who);
    if target is null then raise exception 'Kein Konto mit diesem Freundescode gefunden.'; end if;
  end if;
  if exists (select 1 from public.admins a where a.user_id = target) then raise exception 'Diese Person ist schon Admin.'; end if;
  insert into public.admins (user_id) values (target);
  return target;
end;
$$;

-- Admin entfernen (nur Besitzer; der Besitzer selbst bleibt)
create or replace function public.admin_remove(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Admins verwalten.'; end if;
  if exists (select 1 from public.admins a where a.user_id = p_user and a.is_owner) then raise exception 'Der Besitzer kann nicht entfernt werden.'; end if;
  delete from public.admins a where a.user_id = p_user;
end;
$$;
revoke all on function public.is_owner(uuid), public.admin_list(), public.admin_add(text), public.admin_remove(uuid) from public, anon;
grant execute on function public.is_owner(uuid), public.admin_list(), public.admin_add(text), public.admin_remove(uuid) to authenticated;

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

-- Eigene Artikel: der Besitzer besitzt alles; dazu das Admin-Kennzeichen (nur Besitzer → Admin-Menü)
create or replace function public.my_shop()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'owned', case when public.is_owner()
      then coalesce((select jsonb_agg(i.id order by i.id) from public.shop_items i), '[]'::jsonb)
      else coalesce((select jsonb_agg(p.item_id order by p.created_at) from public.purchases p where p.user_id = auth.uid()), '[]'::jsonb) end,
    'equipped', coalesce((select pr.equipped from public.profiles pr where pr.id = auth.uid()), '{}'::jsonb),
    'admin', public.is_owner()
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
  if public.is_owner(me) then raise exception 'Als Besitzer hast du schon alles.'; end if;
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
  if p_item is not null and not public.is_owner() and not exists (
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
  if not public.is_owner() then raise exception 'Nur für Admins.'; end if;
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
  if not public.is_owner() then raise exception 'Nur für Admins.'; end if;
  update public.shop_items set active = false where id = p_id and id like 'scheme\_c\_%';
end;
$$;

-- Admin: Meldungen ansehen
create or replace function public.admin_reports()
returns table (id bigint, created_at timestamptz, reason text, reporter_name text, reported uuid, reported_name text,
               comment_id bigint, comment_body text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Nur für Admins.'; end if;
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
  if not public.is_owner() then raise exception 'Nur für Admins.'; end if;
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
    'owner', public.is_owner(),
    'food', public.is_admin() or coalesce((select s.pro_until > now() and s.food_until > now() from public.subscriptions s where s.user_id = auth.uid()), false),
    'food_until', (select s.food_until from public.subscriptions s where s.user_id = auth.uid()))
$$;

create or replace function public.admin_grant_pro(p_user uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Aufruf im SQL Editor (kein angemeldeter Nutzer) oder durch einen Admin
  if auth.uid() is not null and not public.is_owner() then raise exception 'Nur für Admins.'; end if;
  insert into public.subscriptions (user_id, pro_until, source, updated_at) values (p_user, p_until, 'manual', now())
  on conflict (user_id) do update set pro_until = excluded.pro_until, source = 'manual', updated_at = now();
end;
$$;
create or replace function public.admin_grant_food(p_user uuid, p_until timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_owner() then raise exception 'Nur für Admins.'; end if;
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
  source     text not null default 'manual' check (source in ('manual', 'search', 'barcode', 'photo', 'chat')),
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
-- Essens-Chat (KI fragt nach, was gegessen wurde): Zähler pro Tag, wie bei der Foto-Auswertung.
-- Die Edge Function „food-chat“ ruft das mit dem Service-Schlüssel auf (Nutzer können es nicht selbst aufrufen).
-- ===========================================================================
alter table public.food_entries drop constraint if exists food_entries_source_check;
alter table public.food_entries add constraint food_entries_source_check check (source in ('manual', 'search', 'barcode', 'photo', 'chat'));

create table if not exists public.food_chat_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  n       integer not null default 0,
  primary key (user_id, day)
);
alter table public.food_chat_usage enable row level security;
revoke all on public.food_chat_usage from anon, authenticated;

create or replace function public.food_chat_claim(p_user uuid, p_limit integer default 60)
returns integer language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if not public.has_pro(p_user) then raise exception 'PRO_REQUIRED'; end if;
  insert into public.food_chat_usage (user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = public.food_chat_usage.n + 1 where public.food_chat_usage.n < p_limit
  returning n into used;
  if used is null then raise exception 'DAILY_LIMIT'; end if;
  return p_limit - used;
end;
$$;
create or replace function public.food_chat_refund(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.food_chat_usage set n = greatest(n - 1, 0) where user_id = p_user and day = current_date
$$;
revoke all on function public.food_chat_claim(uuid, integer), public.food_chat_refund(uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.food_chat_claim(uuid, integer), public.food_chat_refund(uuid) to service_role;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Trainingsplan-Antworten im Konto (damit der Plan auf jedem Gerät da ist und neue Geräte nicht erneut fragen)
-- ---------------------------------------------------------------------------
create table if not exists public.plan_answers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  answers    jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 8000),
  updated_at timestamptz not null default now()
);
alter table public.plan_answers enable row level security;
revoke all on public.plan_answers from anon, authenticated;

create or replace function public.my_plan_answers()
returns jsonb language sql stable security definer set search_path = '' as $$
  select a.answers from public.plan_answers a where a.user_id = auth.uid()
$$;

create or replace function public.set_plan_answers(p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'Ungültige Antworten.'; end if;
  insert into public.plan_answers (user_id, answers) values (auth.uid(), p_answers)
  on conflict (user_id) do update set answers = excluded.answers, updated_at = now();
end;
$$;
revoke all on function public.my_plan_answers(), public.set_plan_answers(jsonb) from public, anon;
grant execute on function public.my_plan_answers(), public.set_plan_answers(jsonb) to authenticated;

-- ===========================================================================
-- Fotos zu Gerichten: Der Besitzer lädt echte Fotos hoch, alle sehen sie (öffentliche Bilder, keine persönlichen Daten).
-- Ohne Foto zeigt die App eine gezeichnete Teller-Illustration. Dateiname = Gericht-ID ohne Umlaute + „.jpg“.
-- ===========================================================================
create table if not exists public.dish_photos (
  dish_id text primary key check (char_length(dish_id) between 1 and 80),
  v integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.dish_photos enable row level security;
revoke all on public.dish_photos from anon, authenticated;
grant select on public.dish_photos to anon, authenticated;
drop policy if exists "dish_photos: alle lesen" on public.dish_photos;
create policy "dish_photos: alle lesen" on public.dish_photos for select to anon, authenticated using (true);

-- Foto gesetzt (p_on) oder entfernt; liefert die neue Versionsnummer (0 = kein Foto). Nur der Besitzer.
create or replace function public.set_dish_photo(p_dish text, p_on boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare nv integer;
begin
  if not public.is_owner() then raise exception 'Nur der Besitzer darf Fotos von Gerichten ändern.'; end if;
  if p_dish is null or char_length(p_dish) not between 1 and 80 then raise exception 'Unbekanntes Gericht.'; end if;
  if p_on then
    insert into public.dish_photos as d (dish_id) values (p_dish)
    on conflict (dish_id) do update set v = d.v + 1, updated_at = now()
    returning d.v into nv;
    return nv;
  end if;
  delete from public.dish_photos where dish_id = p_dish;
  return 0;
end;
$$;
revoke all on function public.set_dish_photo(text, boolean) from public, anon;
grant execute on function public.set_dish_photo(text, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 716800, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 716800, allowed_mime_types = array['image/jpeg'];
drop policy if exists "dish-photos: Besitzer lädt hoch" on storage.objects;
create policy "dish-photos: Besitzer lädt hoch" on storage.objects for insert to authenticated
  with check (bucket_id = 'dish-photos' and public.is_owner() and name ~ '^[a-z0-9-]{1,90}\.jpg$');
drop policy if exists "dish-photos: Besitzer ersetzt" on storage.objects;
create policy "dish-photos: Besitzer ersetzt" on storage.objects for update to authenticated
  using (bucket_id = 'dish-photos' and public.is_owner())
  with check (bucket_id = 'dish-photos' and public.is_owner() and name ~ '^[a-z0-9-]{1,90}\.jpg$');
drop policy if exists "dish-photos: Besitzer löscht" on storage.objects;
create policy "dish-photos: Besitzer löscht" on storage.objects for delete to authenticated
  using (bucket_id = 'dish-photos' and public.is_owner());
-- Zum Ersetzen (upsert) muss der Besitzer die alte Datei auch lesen dürfen; ansehen geht ohnehin über die öffentliche Adresse
drop policy if exists "dish-photos: Besitzer sieht" on storage.objects;
create policy "dish-photos: Besitzer sieht" on storage.objects for select to authenticated
  using (bucket_id = 'dish-photos' and public.is_owner());

-- ===========================================================================
-- Eigene Mahlzeiten: Nutzer speichern Zusammenstellungen (Zutaten mit Gramm und Nährwerten pro 100 g)
-- und tragen sie später mit einem Tipp ins Ernährungstagebuch ein. Nur für das eigene Konto sichtbar.
-- items: [{"n": Name, "b": Marke|null, "g": Gramm, "p": {"kcal","protein","carbs","fat"} pro 100 g}]
-- ===========================================================================
create table if not exists public.my_meals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null check (length(trim(name)) between 1 and 80),
  items      jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40 and length(items::text) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists my_meals_user on public.my_meals (user_id, updated_at desc);
alter table public.my_meals enable row level security;
revoke all on public.my_meals from anon, authenticated;

create or replace function public.my_meals_list()
returns table (id bigint, name text, items jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.name, m.items, m.updated_at from public.my_meals m where m.user_id = auth.uid() order by m.updated_at desc, m.id desc
$$;

-- Neu anlegen (p_id null) oder ändern; liefert die ID
create or replace function public.my_meal_save(p_id bigint, p_name text, p_items jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint; it jsonb;
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if not public.has_pro() then raise exception 'Eigene Mahlzeiten gibt es mit Pro.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 40 then
    raise exception 'Eine Mahlzeit braucht 1 bis 40 Zutaten.';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or length(coalesce(it->>'n', '')) not between 1 and 120
       or coalesce((it->>'g')::numeric, -1) not between 0.1 and 10000
       or jsonb_typeof(it->'p') <> 'object'
       or coalesce((it->'p'->>'kcal')::numeric, -1) not between 0 and 9000 then
      raise exception 'Ungültige Zutat.';
    end if;
  end loop;
  if p_id is null then
    if (select count(*) from public.my_meals m where m.user_id = auth.uid()) >= 300 then raise exception 'Du hast schon 300 eigene Mahlzeiten.'; end if;
    insert into public.my_meals (user_id, name, items) values (auth.uid(), trim(p_name), p_items) returning id into new_id;
    return new_id;
  end if;
  update public.my_meals m set name = trim(p_name), items = p_items, updated_at = now()
  where m.id = p_id and m.user_id = auth.uid() returning m.id into new_id;
  if new_id is null then raise exception 'Mahlzeit nicht gefunden.'; end if;
  return new_id;
end;
$$;

create or replace function public.my_meal_delete(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.my_meals where id = p_id and user_id = auth.uid()
$$;
revoke all on function public.my_meals_list(), public.my_meal_save(bigint, text, jsonb), public.my_meal_delete(bigint) from public, anon;
grant execute on function public.my_meals_list(), public.my_meal_save(bigint, text, jsonb), public.my_meal_delete(bigint) to authenticated;

-- ===========================================================================
-- Mitteilungen (Glocke): Was Freunde mit mir gemacht haben – Anfeuern, Kommentare, Freundschaften, Challenges.
-- Kommt aus den vorhandenen Tabellen; Zeitpunkt von Annahme/Antwort per Trigger. Gelesen-Stand pro Profil.
-- ===========================================================================
alter table public.friendships add column if not exists accepted_at timestamptz;
alter table public.challenges add column if not exists responded_at timestamptz;
alter table public.profiles add column if not exists notif_seen_at timestamptz;

create or replace function public.tg_friendship_accepted()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then new.accepted_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists friendship_accepted on public.friendships;
create trigger friendship_accepted before update on public.friendships for each row execute function public.tg_friendship_accepted();

create or replace function public.tg_challenge_responded()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('active', 'declined') and old.status = 'pending' then new.responded_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists challenge_responded on public.challenges;
create trigger challenge_responded before update on public.challenges for each row execute function public.tg_challenge_responded();

-- Letzte Ereignisse (max. 50, höchstens 30 Tage alt); unread = neuer als notif_seen_at
create or replace function public.my_notifications()
returns table (kind text, at timestamptz, actor uuid, actor_name text, workout_id bigint, challenge_id bigint, body text, unread boolean)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  seen as (select coalesce((select p.notif_seen_at from public.profiles p where p.id = (select id from me)), '-infinity'::timestamptz) as t),
  ev as (
    select 'like'::text as kind, l.created_at as at, l.user_id as actor, w.id as workout_id, null::bigint as challenge_id, null::text as body
      from public.likes l join public.workouts w on w.id = l.workout_id
     where w.user_id = (select id from me) and l.user_id <> w.user_id
    union all
    select 'comment', c.created_at, c.user_id, w.id, null, left(c.body, 120)
      from public.comments c join public.workouts w on w.id = c.workout_id
     where w.user_id = (select id from me) and c.user_id <> w.user_id
    union all
    select 'friend_request', f.created_at, f.requester, null, null, null
      from public.friendships f where f.addressee = (select id from me) and f.status = 'pending'
    union all
    select 'friend_accepted', f.accepted_at, f.addressee, null, null, null
      from public.friendships f where f.requester = (select id from me) and f.status = 'accepted' and f.accepted_at is not null
    union all
    select 'challenge_invite', h.created_at, h.creator, null, h.id, h.metric
      from public.challenges h where h.opponent = (select id from me) and h.status = 'pending'
    union all
    select case when h.status = 'active' then 'challenge_accepted' else 'challenge_declined' end, h.responded_at, h.opponent, null, h.id, h.metric
      from public.challenges h where h.creator = (select id from me) and h.responded_at is not null
  )
  select e.kind, e.at, e.actor, coalesce(p.display_name, 'Jemand'), e.workout_id, e.challenge_id, e.body, e.at > (select t from seen)
    from ev e left join public.profiles p on p.id = e.actor
   where (select id from me) is not null and e.at > now() - interval '30 days'
     and not public.is_blocked((select id from me), e.actor)
   order by e.at desc
   limit 50
$$;

create or replace function public.mark_notifications_seen()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set notif_seen_at = now() where id = auth.uid()
$$;
revoke all on function public.my_notifications(), public.mark_notifications_seen() from public, anon;
grant execute on function public.my_notifications(), public.mark_notifications_seen() to authenticated;

-- ===========================================================================
-- Live-Aktualisierung (Supabase Realtime, „Broadcast aus der Datenbank“): Bei neuen Kommentaren, Anfeuern,
-- Freundes-Trainings, Anfragen und Challenges bekommt jeder Betroffene ein kurzes Signal auf seinem privaten
-- Kanal „user:<id>“. Das Signal enthält nur die Art (und ggf. die Trainings-ID) – die App lädt die Inhalte danach
-- wie gewohnt über die geprüften Funktionen. Nur man selbst kann seinen Kanal abhören (Regel unten).
-- ===========================================================================
create or replace function public.rt_send(p_user uuid, p_kind text, p_workout bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then return; end if;
  perform realtime.send(jsonb_build_object('kind', p_kind, 'workout_id', p_workout), p_kind, 'user:' || p_user::text, true);
exception when others then
  null; -- Live-Signal darf nie das eigentliche Speichern verhindern
end;
$$;
revoke all on function public.rt_send(uuid, text, bigint) from public, anon, authenticated;

-- Freunde, die die Trainings von p_owner sehen dürfen
create or replace function public.rt_viewers(p_owner uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select case when f.requester = p_owner then f.addressee else f.requester end
    from public.friendships f
   where f.status = 'accepted' and (f.requester = p_owner or f.addressee = p_owner)
     and public.can_see(case when f.requester = p_owner then f.addressee else f.requester end, p_owner)
$$;
revoke all on function public.rt_viewers(uuid) from public, anon, authenticated;

create or replace function public.tg_rt_workout()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  for v in select public.rt_viewers(new.user_id) loop perform public.rt_send(v, 'feed', new.id); end loop;
  return null;
end;
$$;
drop trigger if exists rt_workout on public.workouts;
create trigger rt_workout after insert on public.workouts for each row execute function public.tg_rt_workout();

create or replace function public.tg_rt_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid; wid bigint := coalesce(new.workout_id, old.workout_id); actor uuid := coalesce(new.user_id, old.user_id);
begin
  select w.user_id into owner from public.workouts w where w.id = wid;
  if owner is not null and owner <> actor then perform public.rt_send(owner, 'like', wid); end if;
  return null;
end;
$$;
drop trigger if exists rt_like on public.likes;
create trigger rt_like after insert or delete on public.likes for each row execute function public.tg_rt_like();

create or replace function public.tg_rt_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid; wid bigint := coalesce(new.workout_id, old.workout_id); actor uuid := coalesce(new.user_id, old.user_id); v uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = wid;
  if owner is null then return null; end if;
  if owner <> actor then perform public.rt_send(owner, 'comment', wid); end if;
  -- Freunde, die das Training gerade offen haben könnten, sehen den neuen Kommentar ebenfalls sofort
  for v in select public.rt_viewers(owner) loop
    if v <> actor then perform public.rt_send(v, 'comment', wid); end if;
  end loop;
  return null;
end;
$$;
drop trigger if exists rt_comment on public.comments;
create trigger rt_comment after insert or delete on public.comments for each row execute function public.tg_rt_comment();

create or replace function public.tg_rt_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.rt_send(new.addressee, 'friend');
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then perform public.rt_send(new.requester, 'friend'); perform public.rt_send(new.addressee, 'friend');
  end if;
  return null;
end;
$$;
drop trigger if exists rt_friendship on public.friendships;
create trigger rt_friendship after insert or update on public.friendships for each row execute function public.tg_rt_friendship();

create or replace function public.tg_rt_challenge()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.rt_send(new.opponent, 'challenge');
  elsif new.status is distinct from old.status then perform public.rt_send(new.creator, 'challenge'); perform public.rt_send(new.opponent, 'challenge');
  end if;
  return null;
end;
$$;
drop trigger if exists rt_challenge on public.challenges;
create trigger rt_challenge after insert or update on public.challenges for each row execute function public.tg_rt_challenge();

-- Regel: privaten Kanal „user:<id>“ darf nur die Person selbst abhören (nur, wenn Realtime im Projekt vorhanden ist)
do $rt$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "levelup: eigener Live-Kanal" on realtime.messages';
    execute $p$create policy "levelup: eigener Live-Kanal" on realtime.messages for select to authenticated
      using (realtime.topic() = 'user:' || (select auth.uid())::text)$p$;
  end if;
end
$rt$;

-- ===========================================================================
-- Mein Gym: Aufstellung im Konto (Name, Objekte mit Position), Deko & Schilder im Shop (Kauf mit Credits).
-- Welche Geräte man hat, berechnet die App aus den Trainings; hier steht nur, wo was steht.
-- ===========================================================================
alter table public.profiles add column if not exists gym jsonb;

alter table public.shop_items drop constraint if exists shop_items_kind_check;
alter table public.shop_items add constraint shop_items_kind_check check (kind in ('skin', 'scheme', 'accessory', 'title', 'gymdeco'));
-- Gym-Deko (Preise müssen zu web/src/lib/gym.ts DECO_SHOP passen)
insert into public.shop_items (id, kind, name, price) values
  ('gym_sign_cali', 'gymdeco', 'Schild „Calisthenics-Bereich“', 150),
  ('gym_sign_free', 'gymdeco', 'Schild „Free Weights“', 150),
  ('gym_sign_cardio', 'gymdeco', 'Schild „Cardio-Zone“', 150),
  ('gym_sign_legday', 'gymdeco', 'Schild „Leg Day“', 120),
  ('gym_sign_nopain', 'gymdeco', 'Schild „No Pain No Gain“', 200),
  ('gym_neon_beast', 'gymdeco', 'Neon „Beast Mode“', 250),
  ('gym_plant', 'gymdeco', 'Pflanze', 80),
  ('gym_bag', 'gymdeco', 'Boxsack', 220),
  ('gym_dbrack', 'gymdeco', 'Kurzhantel-Ständer', 260),
  ('gym_kettle', 'gymdeco', 'Kettlebell-Reihe', 180),
  ('gym_water', 'gymdeco', 'Wasserspender', 120),
  ('gym_mat', 'gymdeco', 'Sportmatte', 90),
  ('gym_lamp', 'gymdeco', 'Neonlampe', 140),
  ('gym_chalk', 'gymdeco', 'Kreidebox', 80),
  ('gym_rings', 'gymdeco', 'Turnringe', 160)
on conflict (id) do update set kind = excluded.kind, name = excluded.name, price = excluded.price;
-- Vintage-Deko (Update 64) wurde wieder entfernt: nur löschen, wenn sie noch niemand gekauft hat
delete from public.shop_items s where s.id like 'gym\_v\_%' and not exists (select 1 from public.purchases p where p.item_id = s.id);

create or replace function public.my_gym()
returns jsonb language sql stable security definer set search_path = '' as $$
  select p.gym from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.set_my_gym(p_gym jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if p_gym is null or jsonb_typeof(p_gym) <> 'object' or length(p_gym::text) > 8000 then raise exception 'Ungültige Gym-Daten.'; end if;
  if jsonb_typeof(coalesce(p_gym->'objects', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_gym->'objects', '[]'::jsonb)) > 80 then
    raise exception 'Zu viele Objekte im Gym.';
  end if;
  if char_length(coalesce(p_gym->>'name', '')) > 24 then raise exception 'Der Gym-Name ist zu lang (höchstens 24 Zeichen).'; end if;
  if public.is_offensive(coalesce(p_gym->>'name', '')) then raise exception 'Bitte wähle einen freundlichen Namen.'; end if;
  perform public.my_profile(); -- legt das Profil an, falls es fehlt
  update public.profiles set gym = jsonb_build_object('name', coalesce(p_gym->>'name', ''), 'objects', coalesce(p_gym->'objects', '[]'::jsonb))
   where id = auth.uid();
end;
$$;
revoke all on function public.my_gym(), public.set_my_gym(jsonb) from public, anon;
grant execute on function public.my_gym(), public.set_my_gym(jsonb) to authenticated;

-- Freundesprofil zeigt auch das Gym (gleiche Sichtbarkeit wie die Trainings)
create or replace function public.friend_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_see(auth.uid(), p_user) then
    raise exception 'Profil nicht sichtbar';
  end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'equipped', p.equipped, 'week_goal', p.week_goal, 'gym', p.gym, 'adventure', p.adventure) from public.profiles p where p.id = p_user),
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

-- ===========================================================================
-- Version dieses Skripts. Bei JEDER Änderung an dieser Datei erhöhen (und SCHEMA_VERSION in
-- web/src/data/config.ts genauso) – die App zeigt dem Admin dann „Datenbank-Update nötig“.
-- ===========================================================================
-- Datenbank-Update 65: Abenteuer – Art und Name des Begleiters (Fortschritt wird aus den Trainings berechnet)
-- ===========================================================================
alter table public.profiles add column if not exists adventure jsonb;

create or replace function public.my_adventure()
returns jsonb language sql stable security definer set search_path = '' as $$
  select p.adventure from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.set_my_adventure(p_adv jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Bitte melde dich an.'; end if;
  if p_adv is null or jsonb_typeof(p_adv) <> 'object' or length(p_adv::text) > 500 then raise exception 'Ungültige Daten.'; end if;
  if coalesce(p_adv->>'species', '') not in ('drache', 'wolf', 'gorilla') then raise exception 'Unbekannter Begleiter.'; end if;
  if char_length(coalesce(p_adv->>'name', '')) > 16 then raise exception 'Der Name ist zu lang (höchstens 16 Zeichen).'; end if;
  if public.is_offensive(coalesce(p_adv->>'name', '')) then raise exception 'Bitte wähle einen freundlichen Namen.'; end if;
  perform public.my_profile(); -- legt das Profil an, falls es fehlt
  update public.profiles set adventure = jsonb_build_object('species', p_adv->>'species', 'name', coalesce(p_adv->>'name', ''))
   where id = auth.uid();
end;
$$;
revoke all on function public.my_adventure(), public.set_my_adventure(jsonb) from public, anon;
grant execute on function public.my_adventure(), public.set_my_adventure(jsonb) to authenticated;

-- ===========================================================================
create or replace function public.schema_version()
returns integer language sql immutable set search_path = '' as $$ select 65 $$;
revoke all on function public.schema_version() from public, anon;
grant execute on function public.schema_version() to authenticated;
