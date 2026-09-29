"""Build and serve the throwaway artifact on localhost; never writes production data."""
import argparse
import functools
import http.server
import runpy
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parent
parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=4174)
args = parser.parse_args()
runpy.run_path(str(SOURCE / "build.py"))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
print(f"JustStudy · 12 layouts: http://127.0.0.1:{args.port}/?variant=01", flush=True)
server.serve_forever()
