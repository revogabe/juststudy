"""Local preview server with an allowlisted export sink for the 18 Paper files."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent.parent
VARIANTS={'ritual','estudio','caderno'}
PAGES={'01-login','02-home','03-tema','04-focus','05-feedback','06-perfil'}
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_POST(self):
        if self.path!='/export':self.send_error(404);return
        if self.headers.get('Origin') not in {'http://127.0.0.1:4173','http://localhost:4173'}:self.send_error(403);return
        length=int(self.headers.get('Content-Length','0'))
        if length<=0 or length>3_000_000:self.send_error(413);return
        try:
            payload=json.loads(self.rfile.read(length))
            variant=payload['variant'];page=payload['page'];html=payload['html']
            if variant not in VARIANTS or page not in PAGES or not isinstance(html,str) or '<script' in html.lower():raise ValueError()
        except (KeyError,ValueError,TypeError):self.send_error(400);return
        directory=ROOT/'paper'/variant;directory.mkdir(parents=True,exist_ok=True)
        output='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JustStudy — '+variant+' — '+page+'</title></head><body style="margin:0;padding:0">'+html+'</body></html>'
        (directory/(page+'.html')).write_text(output)
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'saved':f'paper/{variant}/{page}.html'}).encode())
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
