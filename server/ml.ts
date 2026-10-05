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

export async function getBenchmark() {
  if (process.env.ML_SERVICE_URL) {
    try {
      const targetUrl = new URL('benchmark', process.env.ML_SERVICE_URL.endsWith('/') ? process.env.ML_SERVICE_URL : `${process.env.ML_SERVICE_URL}/`);
      const response = await fetch(targetUrl.toString());
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[ML Service] Could not fetch from bound ML_SERVICE_URL, using local fallback:', err);
    }
  }

  const battery = readJson('battery_soh.metrics.json');
  const batteryReplay = readJson('battery_replay.json');
  const opssat = readJson('opssat_anomaly.metrics.json');
  return { available: Boolean(battery || opssat), battery, batteryReplay, opssat };
}
