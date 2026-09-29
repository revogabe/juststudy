"""Throwaway home prototype. All original assets and Inter embedded for offline use."""
from pathlib import Path
import base64
import json

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "_source"
ASSETS = ROOT / "assets"
files = {
    "biology": "01M21XZKZ7YV3EHH5J5TFXTQCX.png",
    "mathematics": "01M21Y5PCTDBMNT4A7P2GMRGK6.png",
    "computer": "01M21Y25NX952K8QDWW58PKH8A.png",
    "history": "01M21Y9GE49EQMZ2Q8RNV4GJGS.png",
}
images = {key: "data:image/png;base64," + base64.b64encode((ASSETS / file).read_bytes()).decode() for key, file in files.items()}
font = "data:font/woff2;base64," + base64.b64encode((ASSETS / "inter-variable.woff2").read_bytes()).decode()
css = (SOURCE / "styles.css").read_text().replace("FONT_DATA_URI", font)
html = (SOURCE / "template.html").read_text().replace("/* STYLES */", css)
html = html.replace("/* ASSETS */", "const assets = " + json.dumps(images) + ";")
html = html.replace("/* SCRIPT */", (SOURCE / "app.js").read_text())
(ROOT / "index.html").write_text(html)
print(f"Home prototype: {ROOT / 'index.html'} ({len(html):,} bytes)")
