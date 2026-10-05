import fs from 'node:fs';
import path from 'node:path';

/**
 * Serves PRE-COMPUTED results of the offline training in /ml (metrics + held-out
 * predictions). No model runs inside Node, so there is no runtime ML dependency and
 * nothing here can break the live simulator.
 */
const dir = path.resolve(process.cwd(), 'models');

function readJson(name: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  } catch {
    return null;
  }
}

export function getBenchmark() {
  const battery = readJson('battery_soh.metrics.json');
  const batteryReplay = readJson('battery_replay.json');
  const opssat = readJson('opssat_anomaly.metrics.json');
  return { available: Boolean(battery || opssat), battery, batteryReplay, opssat };
}
