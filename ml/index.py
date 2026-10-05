import json
from pathlib import Path
from http.server import BaseHTTPRequestHandler

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def load_json(name: str):
    p = MODELS_DIR / name
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/benchmark", "/api/benchmark", "/", ""):
            battery = load_json("battery_soh.metrics.json")
            battery_replay = load_json("battery_replay.json")
            opssat = load_json("opssat_anomaly.metrics.json")
            payload = {
                "available": bool(battery or opssat),
                "battery": battery,
                "batteryReplay": battery_replay,
                "opssat": opssat,
                "service": "ml-python",
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/health":
            body = json.dumps({"status": "ok", "service": "ml-python"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "not found"}')
