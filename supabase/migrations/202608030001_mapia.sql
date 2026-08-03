-- MapIA · esquema PostGIS reproducible para Supabase
create extension if not exists postgis;
create extension if not exists pgcrypto;

create type public.area_level as enum ('department', 'province', 'district');
create type public.review_status as enum ('borrador', 'en_revision', 'aprobado', 'rechazado', 'publicado');
create type public.app_role as enum ('technician', 'reviewer', 'admin');

create table public.administrative_areas (
  ubigeo text primary key,
  name text not null,
  level public.area_level not null,
  parent_ubigeo text references public.administrative_areas(ubigeo),
  geom geometry(MultiPolygon, 4326),
  source text not null,
  license text,
  source_version text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roads (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name text not null,
  road_class text not null,
  responsible_authority text not null,
  source text not null,
  license text,
  source_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id, source_version)
);

create table public.road_segments (
  id uuid primary key default gen_random_uuid(),
  road_id uuid not null references public.roads(id),
  ubigeo text not null references public.administrative_areas(ubigeo),
  code text not null unique,
  kind text not null check (kind in ('urbano', 'rural')),
  surface text not null,
  length_m numeric(9,2) not null check (length_m > 0),
  start_reference text,
  end_reference text,
  geom geometry(LineString, 4326) not null,
  responsible_authority text not null,
  status public.review_status not null default 'borrador',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index road_segments_geom_gix on public.road_segments using gist (geom);
create index road_segments_ubigeo_status_idx on public.road_segments (ubigeo, status);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references public.road_segments(id),
  author_user_id uuid references auth.users(id),
  observed_at timestamptz not null,
  location geometry(Point, 4326),
  condition_score smallint check (condition_score between 0 and 100),
  comment text,
  source text not null,
  source_record_id text,
  source_version text not null,
  imported_at timestamptz not null default now(),
  status public.review_status not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_record_id, source_version)
);
create index observations_location_gix on public.observations using gist (location);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  storage_path text not null unique,
  approved_storage_path text,
  media_type text not null,
  sha256 text not null,
  captured_at timestamptz,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hazard_events (
  id uuid primary key default gen_random_uuid(),
  hazard_type text not null,
  occurred_at timestamptz not null,
  geom geometry(Geometry, 4326) not null,
  severity smallint not null check (severity between 0 and 100),
  source text not null,
  license text,
  source_version text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_version, hazard_type, occurred_at)
);
create index hazard_events_geom_gix on public.hazard_events using gist (geom);

create table public.satellite_candidates (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references public.road_segments(id),
  candidate_type text not null,
  sensor text not null,
  acquired_at timestamptz not null,
  baseline_at timestamptz not null,
  before_storage_path text,
  after_storage_path text,
  geom geometry(Geometry, 4326) not null,
  confidence smallint not null check (confidence between 0 and 100),
  status public.review_status not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sensor, acquired_at, segment_id, candidate_type)
);
create index satellite_candidates_geom_gix on public.satellite_candidates using gist (geom);

create table public.priority_snapshots (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.road_segments(id),
  model_version text not null,
  condition_score smallint not null check (condition_score between 0 and 100),
  connectivity_score smallint not null check (connectivity_score between 0 and 100),
  hazard_score smallint not null check (hazard_score between 0 and 100),
  priority_score smallint not null check (priority_score between 0 and 100),
  confidence_score smallint not null check (confidence_score between 0 and 100),
  intervention text not null,
  rationale jsonb not null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(segment_id, model_version, calculated_at)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_version text not null,
  sha256 text not null,
  imported_by uuid references auth.users(id),
  status text not null,
  total_rows integer not null default 0,
  linked_rows integer not null default 0,
  unmatched_rows integer not null default 0,
  errors jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, sha256)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  reviewer_user_id uuid not null references auth.users(id),
  action text not null,
  from_status public.review_status not null,
  to_status public.review_status not null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.user_roles where user_id = auth.uid() $$;

create or replace function public.can_review()
returns boolean language sql stable
as $$ select coalesce(public.current_app_role() in ('reviewer', 'admin'), false) $$;

alter table public.administrative_areas enable row level security;
alter table public.roads enable row level security;
alter table public.road_segments enable row level security;
alter table public.observations enable row level security;
alter table public.evidence enable row level security;
alter table public.hazard_events enable row level security;
alter table public.satellite_candidates enable row level security;
alter table public.priority_snapshots enable row level security;
alter table public.imports enable row level security;
alter table public.reviews enable row level security;
alter table public.user_roles enable row level security;

create policy "public reads areas" on public.administrative_areas for select using (true);
create policy "public reads roads" on public.roads for select using (true);
create policy "public reads published segments" on public.road_segments for select using (
  status = 'publicado' or public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "authenticated creates draft observations" on public.observations for insert to authenticated
with check (author_user_id = auth.uid() and status = 'borrador');
create policy "authors and staff read observations" on public.observations for select to authenticated using (
  author_user_id = auth.uid() or public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "staff updates observations" on public.observations for update to authenticated using (
  public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "public reads approved evidence metadata" on public.evidence for select using (
  is_public or public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "public reads published hazards" on public.hazard_events for select using (true);
create policy "staff reads satellite candidates" on public.satellite_candidates for select to authenticated using (
  public.current_app_role() in ('technician', 'reviewer', 'admin') or status = 'publicado'
);
create policy "public reads published snapshots" on public.priority_snapshots for select using (
  exists (select 1 from public.road_segments s where s.id = segment_id and s.status = 'publicado')
  or public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "staff reads imports" on public.imports for select to authenticated using (
  public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "reviewers create reviews" on public.reviews for insert to authenticated with check (public.can_review());
create policy "staff reads reviews" on public.reviews for select to authenticated using (
  public.current_app_role() in ('technician', 'reviewer', 'admin')
);
create policy "users read own role" on public.user_roles for select to authenticated using (
  user_id = auth.uid() or public.current_app_role() = 'admin'
);

-- Escrituras técnicas: el backend usa funciones verificadas o service_role; nunca se expone service_role al navegador.

create or replace function public.road_segments_mvt(
  z integer, x integer, y integer, selected_ubigeo text, priority_min integer default 0
) returns bytea language sql stable parallel safe as $$
  with bounds as (select st_tileenvelope(z, x, y) geom),
  mvtgeom as (
    select s.id, s.code, p.priority_score, p.confidence_score, p.intervention,
      st_asmvtgeom(st_transform(s.geom, 3857), bounds.geom, 4096, 64, true) geom
    from public.road_segments s
    join lateral (
      select * from public.priority_snapshots p0 where p0.segment_id = s.id
      order by p0.calculated_at desc limit 1
    ) p on true, bounds
    where s.ubigeo = selected_ubigeo and s.status = 'publicado'
      and p.priority_score >= priority_min
      and st_intersects(st_transform(s.geom, 3857), bounds.geom)
  ) select st_asmvt(mvtgeom.*, 'road_segments', 4096, 'geom') from mvtgeom;
$$;
