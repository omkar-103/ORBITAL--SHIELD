import { Pool } from 'pg';

/**
 * ORBITAL-SHIELD persistence layer (server-side only - never import from /src).
 *
 * Design rules:
 *  - The in-memory state in server.ts stays the live source of truth for the UI.
 *  - Every function here is best-effort: if the database is missing or down, they
 *    return null / do nothing and the app keeps running in memory-only mode.
 *  - The pool is created lazily in dbInit() (NOT at import time) because server.ts
 *    calls dotenv.config() AFTER its imports are evaluated.
 */

let pool: Pool | null = null;
let connected = false;
let downUntil = 0;
let flushTimer: NodeJS.Timeout | null = null;

export const isDbConnected = () => connected;

function sslFor(url: string): false | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (/(@|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/.test(url) || /[?&]host=\//.test(url)) return false;
  return { rejectUnauthorized: false }; // Supabase pooler: TLS on, CA not in the default store
}

/** Strip sslmode from the URL: pg-connection-string would otherwise override our ssl option. */
function cleanUrl(url: string): string {
  return url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
}

export async function dbQuery<T = any>(text: string, params: unknown[] = []): Promise<T[] | null> {
  if (!pool || Date.now() < downUntil) return null;
  try {
    const r = await pool.query(text, params as any[]);
    return r.rows as T[];
  } catch (e) {
    downUntil = Date.now() + 15_000; // brief circuit breaker so a dead DB never slows requests
    console.error('[db] query failed (pausing DB for 15s):', (e as Error).message);
    return null;
  }
}

export async function dbInit(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[db] DATABASE_URL not set - running in memory-only mode');
    return false;
  }
  pool = new Pool({
    connectionString: cleanUrl(url),
    ssl: sslFor(url),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (e) => console.error('[db] idle client error:', e.message));

  const ok = await dbQuery('select 1 as ok');
  connected = ok !== null;
  if (!connected) {
    console.error('[db] NOT connected - running in memory-only mode');
    await pool.end().catch(() => {});
    pool = null;
    return false;
  }
  console.log('[db] connected');
  flushTimer = setInterval(() => void flushTelemetry(), 5_000);
  flushTimer.unref();
  return true;
}

export async function dbClose() {
  if (flushTimer) clearInterval(flushTimer);
  await flushTelemetry();
  await pool?.end().catch(() => {});
  pool = null;
  connected = false;
}

export const spacecraftIdFor = (missionId: string) => `${missionId}-SC1`;

/* ------------------------------ server state ------------------------------ */

export async function saveServerState(missionTime: number, activeMissionId: string) {
  await dbQuery(
    `insert into server_state (id, mission_time, active_mission_id, updated_at)
     values ('global', $1, $2, now())
     on conflict (id) do update
       set mission_time = excluded.mission_time,
           active_mission_id = excluded.active_mission_id,
           updated_at = now()`,
    [missionTime, activeMissionId],
  );
}

export async function loadServerState(): Promise<{ missionTime: number; activeMissionId: string } | null> {
  const r = await dbQuery<{ mission_time: number; active_mission_id: string }>(
    `select mission_time, active_mission_id from server_state where id = 'global'`,
  );
  if (!r || r.length === 0) return null;
  return { missionTime: Number(r[0].mission_time), activeMissionId: r[0].active_mission_id };
}

/* -------------------------------- telemetry -------------------------------- */

const COLS = [
  'spacecraft_id', 'mission_time', 'orbit_progress', 'in_eclipse',
  'battery_voltage', 'battery_current', 'battery_temp', 'soc', 'solar_gen', 'power_load',
  'snr', 'link_margin', 'packet_loss', 'attitude_error', 'sensor_throughput',
] as const;
type Row = Record<(typeof COLS)[number], unknown>;

const buffer: Row[] = [];
const MAX_BUFFER = 600;

/** Matches the TelemetryData shape in server.ts (subsystems.* nesting). */
export function queueTelemetry(missionId: string, t: any) {
  if (!pool) return;
  const s = t.subsystems;
  buffer.push({
    spacecraft_id: spacecraftIdFor(missionId),
    mission_time: t.missionTime,
    orbit_progress: t.orbitProgress,
    in_eclipse: t.inEclipse,
    battery_voltage: s.power.batteryVoltage,
    battery_current: s.power.batteryCurrent,
    battery_temp: s.power.batteryTemp,
    soc: s.power.stateOfCharge,
    solar_gen: s.power.solarGeneration,
    power_load: s.power.powerConsumption,
    snr: s.communication.snr,
    link_margin: s.communication.linkMargin,
    packet_loss: s.communication.packetLoss,
    attitude_error: s.aocs.attitudeError,
    sensor_throughput: s.payload.sensorThroughput,
  });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
}

export async function flushTelemetry() {
  if (!pool || buffer.length === 0) return;
  const rows = buffer.splice(0, buffer.length);
  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    COLS.forEach((c) => values.push(r[c] ?? null));
    const base = i * COLS.length;
    return '(' + COLS.map((_, j) => `$${base + j + 1}`).join(',') + ')';
  });
  const res = await dbQuery(`insert into telemetry (${COLS.join(',')}) values ${tuples.join(',')}`, values);
  if (res === null) buffer.unshift(...rows.slice(-300)); // bounded backlog, retried on next flush
}

/* ---------------------------------- faults ---------------------------------- */

export interface FaultLike {
  id: string;
  type: string;
  subsystem: string;
  severity: number;
  startTime: number;
  duration: number;
}

export async function recordFaultInjected(missionId: string, f: FaultLike): Promise<string | null> {
  // server.ts replaces an existing fault of the same type, so close the open one first
  await dbQuery(
    `update fault_events set active = false, cleared_at = now()
     where mission_id = $1 and fault_type = $2 and active`,
    [missionId, f.type],
  );
  const r = await dbQuery<{ id: string }>(
    `insert into fault_events
       (mission_id, spacecraft_id, external_id, fault_type, subsystem, severity, duration_min, start_mission_time)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [missionId, spacecraftIdFor(missionId), f.id, f.type, f.subsystem, f.severity, f.duration, f.startTime],
  );
  return r?.[0]?.id ?? null;
}

export async function recordFaultsCleared(missionId: string) {
  await dbQuery(
    `update fault_events set active = false, cleared_at = now() where mission_id = $1 and active`,
    [missionId],
  );
}

/** Active, non-expired faults in the exact shape server.ts keeps in memory. */
export async function loadActiveFaults(missionId: string, currentMissionTime: number): Promise<FaultLike[]> {
  await dbQuery(
    `update fault_events set active = false, cleared_at = now()
     where mission_id = $1 and active and start_mission_time is not null
       and start_mission_time + duration_min * 60 < $2`,
    [missionId, currentMissionTime],
  );
  const rows = await dbQuery<any>(
    `select id, external_id, fault_type, subsystem, severity, duration_min, start_mission_time
     from fault_events
     where mission_id = $1 and active and start_mission_time is not null
     order by injected_at`,
    [missionId],
  );
  return (rows ?? []).map((r) => ({
    id: r.external_id ?? String(r.id),
    type: r.fault_type,
    subsystem: r.subsystem ?? 'power',
    severity: Number(r.severity),
    startTime: Number(r.start_mission_time),
    duration: Number(r.duration_min),
  }));
}

/* --------------------------------- incidents --------------------------------- */

export interface IncidentLike {
  timestamp: string;
  missionTimeStr: string;
  severity: string;
  title: string;
  subsystem: string;
  details: string;
}

export async function recordIncident(missionId: string, i: IncidentLike) {
  await dbQuery(
    `insert into incident_events (mission_id, mission_time_str, severity, subsystem, title, details, created_at)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [missionId, i.missionTimeStr, i.severity, i.subsystem, i.title, i.details, i.timestamp],
  );
}

export async function seedIncidentsIfEmpty(missionId: string, incidents: IncidentLike[]) {
  const c = await dbQuery<{ n: string }>(`select count(*)::text as n from incident_events`);
  if (!c || Number(c[0].n) > 0) return;
  for (const i of incidents) await recordIncident(missionId, i);
}

/** Same JSON shape the UI already receives from the in-memory list. Returns null if DB unavailable. */
export async function getRecentIncidents(limit = 30) {
  return dbQuery(
    `select id::text as id,
            created_at as "timestamp",
            coalesce(mission_time_str, '') as "missionTimeStr",
            severity,
            title,
            coalesce(subsystem, '') as subsystem,
            coalesce(details, '') as details
     from incident_events
     order by created_at desc
     limit $1`,
    [limit],
  );
}

/* -------------------------------- simulations -------------------------------- */

export async function recordSimulation(
  missionId: string,
  faultEventId: string | null,
  horizonMinutes: number,
  scenarios: any[],
) {
  const run = await dbQuery<{ id: string }>(
    `insert into simulation_runs (mission_id, fault_event_id, horizon_minutes) values ($1,$2,$3) returning id`,
    [missionId, faultEventId, horizonMinutes],
  );
  const runId = run?.[0]?.id;
  if (!runId || scenarios.length === 0) return;

  const per = 11;
  const values: unknown[] = [];
  const tuples = scenarios.map((s, i) => {
    values.push(
      runId, s.id, s.title, s.survivalProbability, s.batteryReserve, s.thermalStability,
      s.commAvailability, s.payloadScienceOutput, s.recoveryTimeMinutes, s.riskLevel,
      JSON.stringify(s.timeline ?? []),
    );
    return '(' + Array.from({ length: per }, (_, j) => `$${i * per + j + 1}`).join(',') + ')';
  });
  await dbQuery(
    `insert into simulation_results
       (simulation_run_id, scenario_code, title, survival_prob, battery_reserve, thermal_stability,
        comm_availability, science_output, recovery_time_min, risk_level, timeline_json)
     values ${tuples.join(',')}`,
    values,
  );
}

/* ------------------------------ operator actions ------------------------------ */

export async function recordOperatorAction(
  missionId: string,
  actionType: string,
  commandCode?: string,
  payload?: unknown,
) {
  await dbQuery(
    `insert into operator_actions (mission_id, action_type, command_code, payload_json) values ($1,$2,$3,$4)`,
    [missionId, actionType, commandCode ?? null, payload === undefined ? null : JSON.stringify(payload)],
  );
}
