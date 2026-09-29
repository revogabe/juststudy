from pathlib import Path
import re
from build import ROOT,SRC
css=(SRC/'picker.css').read_text()
js=(SRC/'picker.js').read_text()
head='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JustStudy · 3 jornadas / 18 telas</title><style>
*{box-sizing:border-box}body{margin:0;background:#e8e8e8;color:#fff;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.toolbar{height:62px;padding:0 22px;background:#171717;display:flex;align-items:center;gap:16px;border-bottom:1px solid #343434}.brand{font-weight:600;letter-spacing:-.3px;font-size:14px;margin-right:8px}.toolbar label{display:flex;align-items:center;gap:8px;color:#a5a5a5;font-size:11px}.toolbar select{background:#292929;color:#f2f2f2;border:1px solid #414141;border-radius:6px;padding:8px;font:inherit}.toolbar button,.toolbar a{border:1px solid #414141;background:#292929;color:#fff;padding:9px 12px;border-radius:6px;font:inherit;text-decoration:none;cursor:pointer}.toolbar button:active{transform:scale(.97)}.toolbar .push{margin-left:auto}.toolbar .primary{background:#fff;color:#171717;border-color:#fff}#stage{height:calc(100vh - 62px);overflow:auto;display:flex;justify-content:center;align-items:flex-start}iframe{width:100%;height:100%;border:0;background:white;flex:none}body.wide #stage{justify-content:flex-start}body.wide iframe{width:1440px;max-width:none}body.mobile iframe{width:390px;max-width:100%;height:calc(100vh - 84px);margin:11px 0;box-shadow:0 0 0 1px #b9b9b9;border-radius:16px}#message{position:fixed;top:76px;right:20px;background:#202020;color:white;padding:12px 18px;border:1px solid #444;border-radius:8px;z-index:100;max-width:350px;font-size:12px}dialog{width:min(760px,calc(100vw - 32px));padding:24px;border:1px solid #bbb;border-radius:12px;background:#fafafa;color:#222;font-size:13px}dialog::backdrop{background:#0007}dialog h2{font-size:22px;margin:0 0 15px}dialog p{line-height:1.7}dialog textarea{display:block;width:100%;height:300px;font:11px monospace;padding:12px;border:1px solid #ddd}dialog button{padding:10px 15px;margin-top:14px;cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #a4baff;outline-offset:3px}.hint{color:#999;font-size:10px}#download-link{white-space:nowrap}@media(max-width:880px){.brand,.hint,.viewport-label{display:none!important}.toolbar{padding:0 10px;gap:8px}.toolbar button,.toolbar a{font-size:10px;padding:9px 8px}.toolbar label{font-size:0}.toolbar select{font-size:11px}.toolbar .push{margin-left:0}}@media(prefers-reduced-motion:reduce){button:active{transform:none}}
'''+css+'''</style></head><body><header class="toolbar"><span class="brand">juststudy / jornadas</span><label>Tela <select id="screen" aria-label="Tela"><option value="1">01 · Login</option><option value="2" selected>02 · Home</option><option value="3">03 · Tema</option><option value="4">04 · Focus</option><option value="5">05 · Feedback</option><option value="6">06 · Perfil</option></select></label><label class="viewport-label">Formato <select id="viewport" aria-label="Formato"><option value="desktop">Desktop</option><option value="wide">Artboard · 1440 px</option><option value="mobile">Mobile · 390 px</option></select></label><span class="hint">18 telas · dados ilustrativos · sem conexão com a API</span><button id="help" class="push">Como usar</button><a id="download-link" href="ritual/02-home.html" download>Baixar HTML</a><button id="save-paper">Salvar HTML Paper</button><button id="copy" class="primary">Copiar para Paper</button></header><div id="stage"></div><nav class="proto-picker" aria-label="Prototype variants"><span class="proto-picker-highlight" aria-hidden="true"></span><button class="proto-picker-item" data-active aria-current="true">Ritual</button><button class="proto-picker-item">Estúdio</button><button class="proto-picker-item">Caderno</button></nav><div id="message" role="status" hidden></div><dialog id="help-dialog"><h2>18 telas, três formas de aprender.</h2><p><strong>Ritual:</strong> uma decisão por vez, tela limpa e foco no próximo passo.<br><strong>Estúdio:</strong> painel com navegação lateral, contexto e comparação.<br><strong>Caderno:</strong> capítulos editoriais, leitura e revisão como parte do percurso.</p><p>Escolha a tela no topo e a jornada no seletor inferior. Use <strong>1, 2, 3 ou ← →</strong> para trocar de jornada; <strong>R</strong> recarrega a tela. Os botões do produto permitem percorrer o fluxo. O feedback contém sete estados selecionáveis.</p><p>Para levar ao Paper, use <strong>Copiar para Paper</strong>: ele prepara somente a tela atual, sem os controles do protótipo, com estilos calculados embutidos. Cole no recurso de importação de HTML do Paper. O resultado da importação depende do suporte do Paper a SVG e CSS. Se preferir, use <strong>Baixar HTML</strong> para obter a tela independente.</p><p>Login, gravação, cobrança, sorteio e avaliação são simulações locais. Nenhuma conta, áudio ou alteração é enviada ao backend.</p><button data-close="help-dialog">Fechar</button></dialog><dialog id="code-dialog"><h2>HTML pronto para copiar</h2><p>O navegador não permitiu copiar automaticamente. Selecione e copie o conteúdo abaixo.</p><textarea id="html-code" readonly aria-label="HTML da tela"></textarea><button data-close="code-dialog">Fechar</button></dialog><script>
const slugs=['ritual','estudio','caderno'];
const pages=['01-login','02-home','03-tema','04-focus','05-feedback','06-perfil'];
let screen=Math.min(6,Math.max(1,Number(new URLSearchParams(location.search).get('screen'))||2));
document.getElementById('screen').value=String(screen);
const variants=slugs.map((slug,i)=>()=>{const path=slug+'/'+pages[screen-1]+'.html';document.getElementById('download-link').href=path;return '<iframe title="'+['Ritual','Estúdio','Caderno'][i]+' · tela '+screen+'" src="'+path+'"></iframe>';});
'''
extras='''
document.getElementById('screen').addEventListener('change',event=>{screen=Number(event.target.value);const url=new URL(location);url.searchParams.set('screen',screen);history.replaceState(null,'',url);mount(current);});
document.getElementById('viewport').addEventListener('change',event=>{document.body.classList.toggle('mobile',event.target.value==='mobile');document.body.classList.toggle('wide',event.target.value==='wide');});
document.getElementById('help').addEventListener('click',()=>document.getElementById('help-dialog').showModal());
for(const b of document.querySelectorAll('[data-close]')) b.addEventListener('click',()=>document.getElementById(b.dataset.close).close());
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='juststudy-page')return;const i=['login','home','tema','focus','feedback','perfil'].indexOf(event.data.page);if(i<0)return;screen=i+1;document.getElementById('screen').value=String(screen);document.getElementById('download-link').href=slugs[current]+'/'+pages[i]+'.html';const url=new URL(location);url.searchParams.set('screen',screen);history.replaceState(null,'',url);});
function notice(message){const el=document.getElementById('message');el.textContent=message;el.hidden=false;setTimeout(()=>el.hidden=true,4500);}
function prepareHTML(){
 const frame=document.querySelector('iframe');
 const doc=frame.contentDocument;const win=frame.contentWindow;
 if(!doc?.getElementById('artboard'))throw new Error('Abra o comparador pelo servidor local para copiar os estilos.');
 const source=doc.getElementById('artboard');
 const properties=['display','position','top','right','bottom','left','box-sizing','width','height','min-width','max-width','min-height','max-height','margin','padding','gap','row-gap','column-gap','grid-template-columns','grid-template-rows','grid-column','grid-row','flex','flex-direction','flex-wrap','flex-shrink','align-items','align-self','justify-content','justify-self','order','color','background-color','background-image','border','border-top','border-right','border-bottom','border-left','border-radius','box-shadow','font-family','font-size','font-weight','font-style','font-variant-numeric','letter-spacing','line-height','text-align','text-transform','text-decoration','white-space','overflow','opacity','transform','transform-origin','vertical-align','list-style','z-index','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-opacity','stroke-opacity'];
 function cloneNode(el){
  if(el.nodeType===3)return doc.createTextNode(el.textContent);
  if(el.nodeType!==1)return null;
  const style=win.getComputedStyle(el);
  if(style.display==='none'||el.hidden||el.matches('[data-prototype-chrome],script,dialog'))return null;
  if(el.parentElement?.tagName==='DETAILS'&&!el.parentElement.open&&el.tagName!=='SUMMARY')return null;
  const clone=el.cloneNode(false);clone.removeAttribute('hidden');
  for(const attr of [...clone.attributes])if(attr.name.startsWith('on')||attr.name.startsWith('data-'))clone.removeAttribute(attr.name);
  for(const property of properties)clone.style.setProperty(property,style.getPropertyValue(property));
  if(style.position==='fixed'){clone.style.position='absolute';}
  if(el.tagName==='INPUT'){clone.setAttribute('value',el.value||el.placeholder);}
  for(const child of el.childNodes){const copied=cloneNode(child);if(copied)clone.append(copied);}
  for(const pseudo of ['::before','::after']){
   const ps=win.getComputedStyle(el,pseudo);
   if(ps.content==='none'||ps.content==='normal'||ps.display==='none')continue;
   const span=doc.createElement('span');span.textContent=ps.content.replace(/^['"]|['"]$/g,'');
   for(const property of properties)span.style.setProperty(property,ps.getPropertyValue(property));
   span.setAttribute('aria-hidden','true');if(pseudo==='::before')clone.prepend(span);else clone.append(span);
  }
  return clone;
 }
 const cloned=cloneNode(source);const bg=win.getComputedStyle(doc.body).backgroundColor;
 cloned.style.cssText+=';position:relative;width:'+win.innerWidth+'px;min-height:'+win.innerHeight+'px;background:'+bg+';color:'+win.getComputedStyle(doc.body).color+';overflow:hidden;';
 const serialized=cloned.outerHTML.replace(/style="([^"]*)"/g,(match,value)=>'style="'+value.replaceAll('&quot;', "'")+'"');
 return '<div style="margin:0;padding:0;background:'+bg+'">'+serialized+'</div>';
}
document.getElementById('save-paper').addEventListener('click',async()=>{try{const html=prepareHTML();const res=await fetch('/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant:slugs[current],page:pages[screen-1],html})});if(!res.ok)throw new Error('Para salvar, inicie o servidor _source/serve.py. A cópia continua disponível.');const data=await res.json();notice('Salvo: '+data.saved);}catch(error){notice(error.message);}});
document.getElementById('copy').addEventListener('click',async()=>{
 try{const html=prepareHTML();document.getElementById('html-code').value=html;try{await navigator.clipboard.writeText(html);notice('HTML da tela copiado com estilos embutidos.');}catch{document.getElementById('html-code').value=html;document.getElementById('code-dialog').showModal();document.getElementById('html-code').select();}}
 catch(error){notice(error.message);}
});
// Forward picker keys from the frame without changing input behavior.
setInterval(()=>{const frame=document.querySelector('iframe');try{const doc=frame?.contentDocument;if(!doc||doc.documentElement.dataset.pickerKeys)return;doc.documentElement.dataset.pickerKeys='ready';doc.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;const n=parseInt(e.key,10);if(n>=1&&n<=3)setActive(n-1);else if(e.key==='ArrowRight')setActive((current+1)%3);else if(e.key==='ArrowLeft')setActive((current+2)%3);else if(e.key.toLowerCase()==='r')mount(current);});}catch{}},300);
</script></body></html>'''
# Keep picker wiring verbatim. Normalize the initial URL before that wiring sees it.
normalizer="const initialURL=new URL(location);const initialV=Number(initialURL.searchParams.get('v'));if(![1,2,3].includes(initialV)){initialURL.searchParams.set('v','1');history.replaceState(null,'',initialURL);}\n"
result=re.sub(r'<button(?![^>]*\btype=)', '<button type="button"',head+normalizer+js+extras)
(ROOT/'index.html').write_text(result)
print('Comparador gerado.')
