-- ORBITAL-SHIELD schema (idempotent: safe on a fresh database AND on one where the earlier draft was already run)
-- Run once in the Supabase SQL Editor.

-- ========== Reference ==========
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text not null default 'OBSERVER'
    check (role in ('FLIGHT_DIRECTOR','TELEMETRY_OPERATOR','OBSERVER')),
  created_at timestamptz not null default now()
);

create table if not exists missions (
  id text primary key,                 -- 'OS-001' (same id the app uses)
  name text not null,
  orbit_type text,
  inclination_deg double precision,
  launch_date date,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create table if not exists spacecraft (
  id text primary key,                 -- 'OS-001-SC1'
  mission_id text not null references missions(id) on delete cascade,
  name text not null,
  bus_model text,
  dry_mass_kg double precision,
  nominal_power_w double precision
);

create table if not exists subsystems (
  id uuid primary key default gen_random_uuid(),
  spacecraft_id text not null references spacecraft(id) on delete cascade,
  code text not null check (code in ('power','thermal','communication','aocs','payload')),
  name text not null,
  health_score double precision,
  status text check (status in ('NOMINAL','WARNING','CRITICAL')),
  updated_at timestamptz not null default now(),
  unique (spacecraft_id, code)
);

-- ========== Server clock / active mission (so a restart resumes where it stopped) ==========
create table if not exists server_state (
  id text primary key,                 -- always 'global'
  mission_time double precision not null,
  active_mission_id text not null,
  updated_at timestamptz not null default now()
);

-- ========== Telemetry ==========
create table if not exists telemetry (
  id bigint generated always as identity primary key,
  spacecraft_id text not null references spacecraft(id) on delete cascade,
  mission_time double precision not null,
  orbit_progress double precision,
  in_eclipse boolean,
  battery_voltage double precision,
  battery_current double precision,
  battery_temp double precision,
  soc double precision,
  solar_gen double precision,
  power_load double precision,
  snr double precision,
  link_margin double precision,
  packet_loss double precision,
  attitude_error double precision,
  sensor_throughput double precision,
  created_at timestamptz not null default now()
);
create index if not exists telemetry_sc_created_idx on telemetry (spacecraft_id, created_at desc);

-- ========== Faults / anomalies ==========
create table if not exists fault_events (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references missions(id) on delete cascade,
  spacecraft_id text references spacecraft(id) on delete set null,
  external_id text,                    -- the 'fault-<timestamp>' id used in server.ts memory
  fault_type text not null,            -- battery_degradation | thermal_stress | sensor_failure | communication_loss
  subsystem text,
  severity double precision not null,  -- percent, 1-100 (same as the API)
  duration_min integer,                -- 5-180
  start_mission_time double precision, -- missionTime (s) at injection, needed to restore expiry correctly
  injected_at timestamptz not null default now(),
  cleared_at timestamptz,
  active boolean not null default true
);
alter table fault_events add column if not exists external_id text;
alter table fault_events add column if not exists start_mission_time double precision;
create index if not exists fault_events_active_idx on fault_events (mission_id) where active;

create table if not exists anomalies (
  id uuid primary key default gen_random_uuid(),
  spacecraft_id text not null references spacecraft(id) on delete cascade,
  subsystem text,
  metric_name text not null,
  observed_value double precision,
  threshold_value double precision,
  severity text,
  detected_at timestamptz not null default now()
);

-- ========== Simulation lab ==========
create table if not exists simulation_runs (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references missions(id) on delete cascade,
  fault_event_id uuid references fault_events(id) on delete set null,
  triggered_by uuid references users(id) on delete set null,
  horizon_minutes integer not null default 90,
  created_at timestamptz not null default now()
);

create table if not exists simulation_results (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references simulation_runs(id) on delete cascade,
  scenario_code text not null,         -- baseline | scenario_a | scenario_b | scenario_c
  title text,
  survival_prob double precision,
  battery_reserve double precision,
  thermal_stability double precision,
  comm_availability double precision,
  science_output double precision,
  recovery_time_min double precision,
  risk_level text,
  timeline_json jsonb
);

create table if not exists recovery_strategies (
  id uuid primary key default gen_random_uuid(),
  scenario_code text not null,
  command_sequence text,
  description text,
  target_subsystem text
);

-- ========== Operations / audit ==========
create table if not exists operator_actions (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references missions(id) on delete cascade,
  operator_id uuid references users(id) on delete set null,
  action_type text not null,
  command_code text,
  payload_json jsonb,
  executed_at timestamptz not null default now()
);

create table if not exists incident_events (
  id uuid primary key default gen_random_uuid(),
  mission_id text not null references missions(id) on delete cascade,
  mission_time_str text,
  severity text not null,              -- INFO | WARNING | CRITICAL
  subsystem text,
  title text not null,
  details text,
  created_at timestamptz not null default now()
);
create index if not exists incident_events_created_idx on incident_events (created_at desc);

create table if not exists system_alerts (
  id uuid primary key default gen_random_uuid(),
  mission_id text references missions(id) on delete cascade,
  level text not null,
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== ML registry (optional, for storing offline-training metrics) ==========
create table if not exists models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  type text,
  accuracy_score double precision,
  metrics_json jsonb,
  created_at timestamptz not null default now(),
  unique (name, version)
);

-- ========== Lock the public REST API (server connects with the DB role, which bypasses RLS) ==========
alter table users enable row level security;
alter table missions enable row level security;
alter table spacecraft enable row level security;
alter table subsystems enable row level security;
alter table server_state enable row level security;
alter table telemetry enable row level security;
alter table fault_events enable row level security;
alter table anomalies enable row level security;
alter table simulation_runs enable row level security;
alter table simulation_results enable row level security;
alter table recovery_strategies enable row level security;
alter table operator_actions enable row level security;
alter table incident_events enable row level security;
alter table system_alerts enable row level security;
alter table models enable row level security;

-- ========== Seed: the 3 missions from server.ts ==========
insert into missions (id, name, orbit_type, inclination_deg, launch_date) values
  ('OS-001','Sentinel LEO Observation','Sun-Synchronous 540km (92 min period)', 97.4,'2025-11-14'),
  ('OS-002','Helios Deep Space Relay','Lagrange Point L2 Lissajous', 0.0,'2026-03-20'),
  ('OS-003','Aegis SAR Sentinel','Polar LEO 680km', 98.2,'2026-08-05')
on conflict (id) do update set
  name = excluded.name, orbit_type = excluded.orbit_type,
  inclination_deg = excluded.inclination_deg, launch_date = excluded.launch_date;

insert into spacecraft (id, mission_id, name) values
  ('OS-001-SC1','OS-001','AeroSat-Twin Mk IV'),
  ('OS-002-SC1','OS-002','ChronoRelay Alpha'),
  ('OS-003-SC1','OS-003','RadarAegis-3')
on conflict (id) do update set name = excluded.name;
