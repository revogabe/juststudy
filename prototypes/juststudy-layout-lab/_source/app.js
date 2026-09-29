/* Throwaway home exploration: 12 different ways to choose a subject, draw a topic, revisit a study and start focus. */
const subjects = [
  {
    id: "biology",
    name: "Biology",
    score: 128,
    topics: [
      ["How neurons communicate", "How does a signal travel from one neuron to another?"],
      ["Natural selection", "Why do some traits become more common over generations?"],
      ["Cell division", "How does one cell become two without losing information?"],
      ["The immune system", "How does your body recognize something it has never seen before?"],
      ["Photosynthesis", "How can sunlight become the energy in a living thing?"],
    ],
  },
  {
    id: "mathematics",
    name: "Mathematics",
    score: 203,
    topics: [
      ["Prime numbers", "Why can every whole number be broken down into primes?"],
      ["Linear equations", "What does it really mean to solve an equation?"],
      ["Understanding integers", "How do negative numbers change the way we count?"],
      ["The Pythagorean theorem", "Why does this relationship hold for every right triangle?"],
      ["Probability", "How can we reason about something that hasn't happened yet?"],
    ],
  },
  {
    id: "computer",
    name: "Computer Science",
    score: 86,
    topics: [
      ["How algorithms think", "What makes one way of solving a problem better than another?"],
      ["Binary search", "How can you find an answer by discarding half the possibilities?"],
      ["Neural networks", "How does a network learn from examples?"],
      ["Recursion", "When does solving a smaller problem solve the whole problem?"],
      ["The internet", "What happens between clicking a link and seeing a page?"],
    ],
  },
  {
    id: "history",
    name: "History",
    score: 154,
    topics: [
      ["The Renaissance", "What changed when people began looking at the world differently?"],
      ["The printing press", "How did one invention change who could share knowledge?"],
      ["The Industrial Revolution", "How did machines reshape everyday life?"],
      ["Ancient trade routes", "How did goods carry ideas across continents?"],
      ["The Roman Republic", "How was power shared before Rome became an empire?"],
    ],
  },
];
const recentStudies = [
  { subject: "mathematics", topic: 1, delta: -10, time: "Today" },
  { subject: "mathematics", topic: 2, delta: null, time: "Yesterday" },
  { subject: "mathematics", topic: 0, delta: 103, time: "Yesterday" },
  { subject: "biology", topic: 0, delta: 28, time: "2 days ago" },
  { subject: "computer", topic: 1, delta: 16, time: "3 days ago" },
];
const variants = [
  {
    id: "01",
    name: "Carrossel com intenção",
    layout: "carousel",
    lead: "O gesto conhecido da referência, agora com um tema concreto para começar.",
    flow: "Card da matéria → score e tema → Randomize → Start 1 Hour",
    why: "Preserva o carrossel, o score central e o card escuro. A escolha de matéria atualiza o score e o tema acima, onde a ação já está.",
    motion: "O tema desliza como uma linha de sorteio; o dado acompanha a troca.",
    trade: "O carrossel pede exploração lateral; cada card traz seu score para facilitar a comparação.",
  },
  {
    id: "02",
    name: "O card é o ponto de partida",
    layout: "launch",
    lead: "Cada matéria reúne score, tema e início de sessão no próprio card.",
    flow: "Comparar scores → escolher card → sortear ali → iniciar ali",
    why: "As ações pertencem à matéria, sem depender de um botão global distante. O histórico permanece na coluna ao lado.",
    motion: "Só o tema do card sorteado troca com uma breve revelação vertical.",
    trade: "A grade ocupa mais altura, mas todas as matérias têm o mesmo peso.",
  },
  {
    id: "03",
    name: "Mesa de estudo",
    layout: "workspace",
    lead: "Matéria à esquerda. Tema no centro. Acesso rápido à direita.",
    flow: "Lista com scores → tema central → play circular → foco",
    why: "Mantém a seleção, o tema preparado e o histórico em regiões estáveis. O grande play inicia a sessão apresentada ao lado.",
    motion: "Uma curta transição de opacidade revela o novo tema sem deslocar o layout.",
    trade: "Favorece a consulta frequente; a divisão em três regiões vira uma coluna no mobile.",
  },
  {
    id: "04",
    name: "Baralho de temas",
    layout: "deck",
    lead: "Um tema por carta; um novo sorteio traz a próxima carta à frente.",
    flow: "Escolher matéria e ver score → puxar outra carta → começar",
    why: "A imagem da matéria dá identidade ao baralho. O dado encaixado na carta explica onde a descoberta acontece.",
    motion: "A carta sai levemente de lado e a próxima entra, em 240 ms.",
    trade: "Prioriza descoberta de um tema por vez; os recentes ficam sempre ao lado do baralho.",
  },
  {
    id: "05",
    name: "Da matéria ao foco",
    layout: "steps",
    lead: "Três escolhas legíveis em uma única linha de raciocínio.",
    flow: "01 Matéria e score → 02 Tema ou sorteio → 03 Sessão de 1 hora",
    why: "Conecta as decisões em três áreas adjacentes sem transformar a home em um formulário de várias telas.",
    motion: "O sorteio troca apenas a resposta da segunda área.",
    trade: "A sequência é explícita; para usuários habituais há mais estrutura visual.",
  },
  {
    id: "06",
    name: "Voltar pelo histórico",
    layout: "return",
    lead: "A próxima sessão pode começar onde a anterior terminou.",
    flow: "Tema recente → preparar no painel → iniciar; ou escolher matéria e sortear",
    why: "Temas recentes são a área principal. Um clique prepara o estudo; o play com rótulo de duração permite iniciá-lo diretamente.",
    motion: "O sorteio substitui o tema no painel lateral com uma curta troca horizontal.",
    trade: "É a proposta mais voltada a quem retorna. A descoberta continua no painel de nova sessão.",
  },
  {
    id: "07",
    name: "Matérias que se abrem",
    layout: "accordion",
    lead: "Todos os scores visíveis. Só a matéria escolhida revela as ações.",
    flow: "Abrir matéria → tema e recentes locais → sortear ou iniciar",
    why: "Cada linha apresenta nome e score. Expandir revela imagem, tema, ações e atalhos recentes no mesmo contexto.",
    motion: "O título sorteado troca no painel aberto; as demais matérias permanecem estáveis.",
    trade: "Só uma matéria fica expandida; a comparação de temas exige trocar de linha.",
  },
  {
    id: "08",
    name: "Caderno da matéria",
    layout: "dossier",
    lead: "Score, tema e últimos estudos formam uma página da matéria.",
    flow: "Aba com score → tema → sorteio inline → Start 1 Hour",
    why: "As abas mantêm todos os scores acessíveis. A composição dá espaço à imagem original, ao tema e ao histórico da matéria selecionada.",
    motion: "O tema ganha uma breve revelação de baixo para cima.",
    trade: "O histórico principal é filtrado por matéria; os demais continuam em atalhos de acesso rápido.",
  },
  {
    id: "09",
    name: "Uma linha para começar",
    layout: "composer",
    lead: "Matéria, tema, sorteio e foco cabem em um único controle de sessão.",
    flow: "Escolher matéria → buscar ou sortear tema → play da barra",
    why: "Uma barra reúne as decisões. A busca filtra temas reais e recentes, enquanto o dado resolve a escolha quando não há intenção definida.",
    motion: "O tema sorteado é revelado no campo e no resumo, sem mover o botão de foco.",
    trade: "A composição é compacta; a relação entre os controles precisa ser lida uma vez.",
  },
  {
    id: "10",
    name: "Trilho de temas",
    layout: "rail",
    lead: "A matéria fica fixa. Os temas passam por um trilho para explorar.",
    flow: "Matéria e score → tema anterior/próximo ou sorteio → play no card",
    why: "Troca o carrossel de matérias por um carrossel de temas. As setas permitem explorar sem depender da sorte.",
    motion: "O card muda de posição no trilho; Randomize pula para outro tema da mesma matéria.",
    trade: "É mais exploratória e menos densa; apenas três temas aparecem por vez.",
  },
  {
    id: "11",
    name: "Início direto por linha",
    layout: "direct",
    lead: "Cada linha é uma sessão possível: score, tema, dado e play.",
    flow: "Escolher linha → sortear naquela matéria → play de 1 hora",
    why: "Dispensa uma seleção prévia. Tanto o sorteio quanto o início têm escopo explícito por matéria e ficam próximos do tema.",
    motion: "Só o texto da linha acionada muda; o restante da tabela permanece estável.",
    trade: "Favorece velocidade e comparação, com menos espaço para a imagem.",
  },
  {
    id: "12",
    name: "Sessão na barra inferior",
    layout: "dock",
    lead: "Explore matérias e recentes; o tema preparado acompanha você na barra.",
    flow: "Card ou recente → tema na barra persistente → dado ou Start 1 Hour",
    why: "A área principal serve para explorar. A barra de sessão dentro da home mantém o tema e as ações acessíveis durante a rolagem.",
    motion: "O novo tema desliza para dentro da barra, como uma troca de faixa.",
    trade: "A barra ocupa espaço fixo na parte inferior, compensado por uma área de respiro no conteúdo.",
  },
];
const state = {
  subject: "mathematics",
  topics: Object.fromEntries(subjects.map((s) => [s.id, 0])),
  query: "",
  source: "suggested",
  session: null,
};
let variant = variants.find((v) => v.id === new URLSearchParams(location.search).get("variant")) || variants[0];
let noticeTimer;
let inputKeyboard = false;
let randomizing = false;
const getSubject = (id = state.subject) => subjects.find((s) => s.id === id);
const getTopic = (s = getSubject()) => s.topics[state.topics[s.id]];
const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const iconPaths = {
  book: '<path d="M10 16.723c.189 0 .377-.05.549-.149.714-.412 1.924-.941 3.49-.938.999.001 1.852.219 2.522.483.72.283 1.493-.267 1.493-1.041V4.986c0-.393-.201-.756-.54-.956-.599-.353-1.559-.796-2.792-.923M10 16.723c-.189 0-.377-.05-.549-.149-.714-.412-1.924-.941-3.49-.938-.999.001-1.852.219-2.522.483-.72.283-1.493-.263-1.493-1.037V4.982c0-.393.201-.751.54-.951.708-.418 1.918-.959 3.488-.959 2.1 0 3.553.969 4.027 1.314M9.999 16.723c.7-1.469 2.171-2.46 4.012-2.663.41-.452.711-.409.711-.821V2.584c0-.508-.453-.908-.955-.832-1.681.253-3.083 1.178-3.768 2.632v12.339Z"/>',
  account: '<path d="m10 2 6 3-6 3-6-3 6-3Zm-4 5v2a4 4 0 0 0 8 0V7m-10 11a7 7 0 0 1 12 0M16 5v5"/>',
  logout: '<path d="M11 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3M7 6l-4 4 4 4M3 10h8"/>',
  dice: '<rect x="3.056" y="3.056" width="13.889" height="13.889" rx="2"/><g fill="currentColor" stroke="none"><circle cx="13.333" cy="6.667" r=".694"/><circle cx="10" cy="10" r=".694"/><circle cx="6.667" cy="6.667" r=".694"/><circle cx="13.333" cy="13.333" r=".694"/><circle cx="6.667" cy="13.333" r=".694"/></g>',
  play: '<path d="M5 3.8c0-1.2 1.3-1.9 2.3-1.3l10 6.1c1 .6 1 2.2 0 2.8l-10 6.1c-1 .6-2.3-.1-2.3-1.3Z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M4 10h12m-5-5 5 5-5 5"/>',
  chevron: '<path d="m7 4 6 6-6 6"/>',
  check: '<path d="m4 10 4 4 8-9"/>',
  search: '<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>',
};
const ic = (name) =>
  `<svg class="icon icon-${name}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
function logo() {
  return `<button class="brand" type="button" data-action="home" aria-label="Just Study home">Just<svg class="brand-book" viewBox="0 0 28 28" aria-hidden="true"><g transform="rotate(90 14 14)"><path d="M14 23.413c.265 0 .527-.07.769-.209 1-.576 2.694-1.317 4.886-1.314 1.399.001 2.592.307 3.53.677 1.008.397 2.091-.373 2.091-1.457V6.98c0-.551-.281-1.058-.756-1.338-.839-.495-2.183-1.114-3.91-1.293" fill="#AAAAAA" stroke="#AAAAAA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 23.413c-.265 0-.527-.07-.769-.209-1-.576-2.694-1.317-4.886-1.314-1.399.001-2.592.307-3.53.677-1.008.397-2.091-.369-2.091-1.453V6.974c0-.551.281-1.051.756-1.331.992-.586 2.686-1.343 4.884-1.343 2.94 0 4.975 1.357 5.637 1.84" fill="#DBDBDB" stroke="#DBDBDB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.999 23.413C14.979 21.356 17.038 19.969 19.615 19.684C20.189 19.052 20.61 19.111 20.61 18.535V3.618c0-.712-.635-1.272-1.337-1.166C16.92 2.807 15 4 14 5Z" fill="#C6C6C6" stroke="#C6C6C6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></svg>Study</button>`;
}
function header() {
  return `<header class="product-header">${logo()}<nav aria-label="Main navigation"><button type="button" class="pill secondary" data-action="home" aria-current="page">${ic("book")}Home</button><button type="button" class="pill ghost" data-action="account">${ic("account")}Account</button></nav><button type="button" class="logout" data-action="logout" aria-label="Log out">${ic("logout")}</button></header>`;
}
iconPaths.clock = '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>';
iconPaths.pause = '<path d="M7 4v12M13 4v12" stroke-width="3"/>';
function imageFor(s, extra = "") {
  return `<img class="subject-image ${extra}" src="${assets[s.id]}" alt="" draggable="false">`;
}
function delta(value) {
  return value === null
    ? `<span class="delta unfinished">In progress</span>`
    : `<span class="delta ${value >= 0 ? "positive" : "negative"}">${value > 0 ? "+" : ""}${value}</span>`;
}
function score(s = getSubject(), mode = "") {
  return `<section class="score ${mode}" aria-label="${s.name} score ${s.score}"><span class="score-subject">${s.name}</span><h1>Score: <span>${s.score}</span></h1><p>Your score reflects how well you explain<br> what you learn.</p></section>`;
}
function topic(s = getSubject(), mode = "") {
  const t = getTopic(s);
  return `<div class="topic ${mode}" data-topic-zone="${s.id}"><span class="eyebrow">${state.source === "recent" && state.subject === s.id ? "Ready to revisit" : "Your next topic"}</span><h2 data-topic-title>${t[0]}</h2><p>${t[1]}</p></div>`;
}
function randomButton(s = getSubject(), mode = "", label = "Randomize") {
  return `<button type="button" class="random pill secondary ${mode}" data-action="randomize" data-for="${s.id}" aria-label="Randomize topic in ${s.name}" title="Draw another topic in ${s.name}">${ic("dice")}${mode.includes("icon-only") ? "" : `<span>${label}</span>`}</button>`;
}
function startButton(s = getSubject(), mode = "", label = "Start 1 Hour") {
  return `<button type="button" class="start pill primary ${mode}" data-action="start" data-for="${s.id}" aria-label="Start 1 hour on ${esc(getTopic(s)[0])}">${mode.includes("round-play") ? ic("play") : `${label}${ic("play")}`}</button>`;
}
function actions(s = getSubject(), mode = "") {
  return `<div class="study-actions ${mode}">${randomButton(s)}${startButton(s)}</div>`;
}
function subjectNav(mode = "") {
  return `<nav class="subject-nav ${mode}" aria-label="Subjects and scores">${subjects.map((s) => `<button type="button" data-subject="${s.id}" class="subject-choice ${state.subject === s.id ? "selected" : ""}" aria-pressed="${state.subject === s.id}">${imageFor(s)}<span>${s.name}</span><span class="subject-score"><small>Score</small>${s.score}</span></button>`).join("")}</nav>`;
}
function subjectCard(s) {
  return `<button type="button" class="subject-card ${state.subject === s.id ? "selected" : ""}" data-subject="${s.id}" aria-pressed="${state.subject === s.id}">${imageFor(s)}<span class="card-heading"><strong>${s.name}</strong><span class="card-score">${s.score}<small>score</small></span></span><span class="card-description">Discover patterns, work through problems, and understand the reasoning behind them.</span></button>`;
}
function recent(mode = "", filter = null, limit = 4) {
  const items = recentStudies
    .map((r, i) => ({ ...r, i }))
    .filter((r) => !filter || r.subject === filter)
    .slice(0, limit);
  return `<section class="recent ${mode}" aria-label="Recent studies"><div class="section-heading"><h2>${filter ? "Recently in this subject" : "Recent studies"}</h2><span>Click a topic to revisit</span></div><div class="recent-list">${
    items
      .map((r) => {
        const s = getSubject(r.subject);
        const t = s.topics[r.topic];
        return `<button type="button" class="recent-item ${state.subject === s.id && state.topics[s.id] === r.topic && state.source === "recent" ? "prepared" : ""}" data-recent="${r.i}" aria-label="Revisit ${t[0]} in ${s.name}">${imageFor(s)}<span class="recent-copy"><strong>${t[0]}</strong><span>${s.name} · ${r.time}</span></span>${delta(r.delta)}<span class="recent-arrow">${ic("arrow")}</span></button>`;
      })
      .join("") || `<p class="empty">No recent studies in this subject yet. Draw a topic to begin.</p>`
  }</div></section>`;
}
function carousel() {
  return `<main class="home carousel-home"><div class="original-focus">${score()}${topic()}${actions()}</div><div class="subject-carousel" aria-label="Choose your subject">${subjects.map(subjectCard).join("")}</div>${recent("recent-inline")}</main>`;
}
function launch() {
  return `<main class="home launch-home"><div class="page-heading"><h1>What will you study?</h1><p>Your subjects. Your progress. Your next idea.</p></div><div class="launch-layout"><section class="launch-grid" aria-label="Subject launch cards">${subjects.map((s) => `<article class="launch-card ${s.id === state.subject ? "selected" : ""}"><button class="launch-select" type="button" data-subject="${s.id}" aria-pressed="${s.id === state.subject}">${imageFor(s)}<span class="card-heading"><strong>${s.name}</strong><span class="card-score">${s.score}<small>score</small></span></span></button>${topic(s)}<div class="launch-actions">${randomButton(s, "text-random")}${startButton(s, "", "Focus 1h")}</div></article>`).join("")}</section><aside>${recent("recent-vertical")}</aside></div></main>`;
}
function workspace() {
  const s = getSubject();
  return `<main class="home workspace-home"><aside class="subject-rail"><h2 class="section-label">Your subjects</h2>${subjectNav("vertical")}</aside><section class="workspace-main"><div class="workspace-heading">${score(s, "compact")}<span class="eyebrow">1 hour for a new idea</span></div>${imageFor(s)}<div class="workspace-topic">${topic(s)}<div class="play-label">${startButton(s, "round-play")}<span>Start 1 hour</span></div></div>${randomButton(s, "text-random", "Try another topic")}</section><aside class="history-rail">${recent("recent-vertical")}</aside></main>`;
}
function deck() {
  const s = getSubject();
  return `<main class="home deck-home">${subjectNav("horizontal")}<div class="deck-layout"><aside>${score(s)}<p class="side-note">A little curiosity.<br>One hour of focus.</p></aside><section class="deck-area"><div class="card-stack"><article class="topic-card" data-motion-zone="${s.id}">${imageFor(s)}<div class="topic-card-copy">${topic(s)}<div class="deck-caption"><span>${s.name}</span><span>${String(state.topics[s.id] + 1).padStart(2, "0")} / 05</span></div></div></article>${randomButton(s, "deck-dice icon-only")}</div><div class="deck-start">${startButton(s)}<span>Draw another card with the dice</span></div></section><aside>${recent("recent-vertical")}</aside></div></main>`;
}
function steps() {
  const s = getSubject();
  return `<main class="home steps-home"><div class="page-heading"><h1>Make time to understand.</h1><p>A subject, a question, one hour.</p></div><div class="steps-layout"><section class="step-subject"><h2 class="step-label"><span>01</span> Choose a subject</h2>${subjectNav("vertical")}</section><section class="step-topic"><h2 class="step-label"><span>02</span> Find your topic</h2>${imageFor(s)}${topic(s)}${randomButton(s)}</section><section class="step-focus"><h2 class="step-label"><span>03</span> Make it yours</h2><button type="button" class="focus-clock" data-action="start" data-for="${s.id}" aria-label="Start 1 hour on ${getTopic(s)[0]}"><span>60<small>minutes</small></span><span class="clock-play">${ic("play")} Start focus</span></button><p>${s.name}<br><strong>Score: ${s.score}</strong></p></section></div>${recent("recent-inline")}</main>`;
}
function returnHome() {
  const s = getSubject();
  return `<main class="home return-home">${subjectNav("horizontal")}<div class="return-layout"><section><div class="page-heading"><h1>Pick up a recent idea.</h1><p>Revisit a topic, or make room for a new one.</p></div><div class="return-list">${recentStudies
    .slice(0, 4)
    .map((r, i) => {
      const rs = getSubject(r.subject);
      const t = rs.topics[r.topic];
      return `<article class="return-item ${state.subject === r.subject && state.topics[r.subject] === r.topic ? "is-current" : ""}"><button type="button" class="return-select" data-recent="${i}">${imageFor(rs)}<span><span class="eyebrow">${rs.name} · ${r.time}</span><strong>${t[0]}</strong><span class="return-question">${t[1]}</span></span></button><div class="return-end">${delta(r.delta)}<button type="button" class="quick-play" data-action="start-recent" data-index="${i}" aria-label="Start 1 hour on ${t[0]}" title="Study again · 1 hour">${ic("play")}<span>1h</span></button></div></article>`;
    })
    .join(
      "",
    )}</div></section><aside class="next-session">${score(s, "compact")}${imageFor(s)}${topic(s)}${randomButton(s)}${startButton(s)}</aside></div></main>`;
}
function accordion() {
  return `<main class="home accordion-home"><div class="page-heading"><h1>Your subjects.</h1><p>See your progress. Open the next question.</p></div><div class="subject-accordion">${subjects.map((s) => `<section class="accordion-item ${s.id === state.subject ? "is-open" : ""}"><button type="button" class="accordion-trigger" data-subject="${s.id}" aria-expanded="${s.id === state.subject}" aria-controls="panel-${s.id}">${imageFor(s)}<strong>${s.name}</strong><span>Score: <b>${s.score}</b></span>${ic(s.id === state.subject ? "check" : "chevron")}</button>${s.id === state.subject ? `<div class="accordion-panel" id="panel-${s.id}">${imageFor(s)}<div>${topic(s)}${actions(s)}${recent("recent-small", s.id, 2)}</div></div>` : `<div id="panel-${s.id}" hidden></div>`}</section>`).join("")}</div>${recent("recent-inline")}</main>`;
}
function dossier() {
  const s = getSubject();
  return `<main class="home dossier-home">${subjectNav("tabs")}<div class="dossier-top"><aside>${score(s)}<span class="updated">Updated at 10:49pm</span></aside>${imageFor(s)}<section>${topic(s)}${randomButton(s, "text-random", "Try another topic")}${startButton(s)}</section></div>${recent("recent-timeline", s.id)}<div class="quick-others"><span>Jump back into</span>${recentStudies
    .filter((r) => r.subject !== s.id)
    .slice(0, 2)
    .map(
      (r) =>
        `<button class="pill secondary" type="button" data-recent="${recentStudies.indexOf(r)}">${getSubject(r.subject).topics[r.topic][0]}${ic("arrow")}</button>`,
    )
    .join("")}</div></main>`;
}
function searchResults() {
  if (!state.query) return "";
  const matches = subjects
    .flatMap((s) => s.topics.map((t, i) => ({ s, t, i })))
    .filter((r) => `${r.s.name} ${r.t[0]}`.toLowerCase().includes(state.query.toLowerCase()));
  return `<div class="search-results"><span class="eyebrow">Matching topics</span>${
    matches
      .slice(0, 6)
      .map(
        (r) =>
          `<button type="button" data-topic-index="${r.i}" data-topic-subject="${r.s.id}"><span><strong>${esc(r.t[0])}</strong><small>${r.s.name}</small></span>${ic("arrow")}</button>`,
      )
      .join("") || `<p>No topics found. Try another word or use Randomize.</p>`
  }</div>`;
}
function composer() {
  const s = getSubject();
  return `<main class="home composer-home"><div class="composer-hero">${score(s)}${imageFor(s)}</div><section class="session-composer"><div class="composer-caption"><span class="eyebrow">Build your next session</span><span>1 hour of focus</span></div><div class="composer-bar"><label class="composer-subject"><span>Subject</span><select id="composer-subject" aria-label="Session subject">${subjects.map((item) => `<option value="${item.id}" ${item.id === s.id ? "selected" : ""}>${item.name} · ${item.score}</option>`).join("")}</select></label><label class="composer-search">${ic("search")}<input id="topic-search" type="search" autocomplete="off" aria-label="Search topics" placeholder="Search a topic, or leave it to chance" value="${esc(state.query)}"></label>${randomButton(s, "icon-only")}${startButton(s, "", "Focus 1h")}</div><div id="search-results">${searchResults()}</div><div class="composer-ready">${topic(s)}<span class="ready-duration">${ic("clock")} 60 minutes</span></div></section>${subjectNav("score-strip")}${recent("recent-inline")}</main>`;
}
function topicRail() {
  const s = getSubject();
  const ix = state.topics[s.id];
  return `<main class="home topic-rail-home"><div class="rail-top">${score(s, "compact")}${subjectNav("score-strip")}</div><div class="topic-track">${[
    -1, 0, 1,
  ]
    .map((offset) => {
      const i = (ix + offset + s.topics.length) % s.topics.length;
      const t = s.topics[i];
      return offset === 0
        ? `<article class="rail-card active" data-motion-zone="${s.id}">${imageFor(s)}<div>${topic(s)}<div class="rail-card-foot"><span>${s.name}</span>${startButton(s, "", "Start 1 Hour")}</div></div></article>`
        : `<button type="button" class="rail-card side" data-topic-index="${i}" data-topic-subject="${s.id}" aria-label="Choose topic ${t[0]}">${imageFor(s)}<span class="eyebrow">${offset < 0 ? "Previous topic" : "Next topic"}</span><strong>${t[0]}</strong><span>${t[1]}</span></button>`;
    })
    .join(
      "",
    )}</div><div class="rail-controls"><button type="button" class="circle secondary" data-action="topic-previous" aria-label="Previous topic">←</button>${randomButton(s)}<button type="button" class="circle secondary" data-action="topic-next" aria-label="Next topic">→</button></div>${recent("recent-inline")}</main>`;
}
function direct() {
  return `<main class="home direct-home"><div class="page-heading"><h1>Find your next hour.</h1><p>Draw a topic in any subject. Press play when you're ready.</p></div><div class="direct-layout"><section class="direct-list" aria-label="Sessions by subject"><div class="direct-labels"><span>Subject / score</span><span>Next topic</span><span>1 hour</span></div>${subjects.map((s) => `<article class="direct-row ${s.id === state.subject ? "is-current" : ""}"><div class="direct-subject">${imageFor(s)}<span><strong>${s.name}</strong><span>Score: ${s.score}</span></span></div>${topic(s)}<div class="direct-actions">${randomButton(s, "icon-only")}${startButton(s, "round-play")}</div></article>`).join("")}</section><aside>${recent("recent-vertical")}</aside></div></main>`;
}
function dock() {
  const s = getSubject();
  return `<main class="home dock-home"><div class="dock-layout"><aside>${score(s)}${subjectNav("vertical")}</aside><section><div class="dock-art">${imageFor(s)}<span class="art-caption">${s.name}</span></div>${recent("recent-vertical")}</section></div><section class="session-dock" aria-label="Prepared focus session">${imageFor(s)}${topic(s)}<div class="dock-actions">${randomButton(s, "icon-only")}${startButton(s)}</div></section></main>`;
}
const renderers = [carousel, launch, workspace, deck, steps, returnHome, accordion, dossier, composer, topicRail, direct, dock];
function render() {
  const oldFocus = document.activeElement;
  const focusSubject = oldFocus?.dataset?.subject;
  const focusAction = oldFocus?.dataset?.action;
  const focusFor = oldFocus?.dataset?.for;
  const app = document.getElementById("app");
  app.className = `variant-${variant.id} layout-${variant.layout}`;
  app.innerHTML = header() + renderers[Number(variant.id) - 1]();
  if (focusSubject) app.querySelector(`[data-subject="${focusSubject}"]`)?.focus({ preventScroll: true });
  else if (focusAction && !app.contains(oldFocus))
    app.querySelector(`[data-action="${focusAction}"]${focusFor ? `[data-for="${focusFor}"]` : ""}`)?.focus({ preventScroll: true });
  document.getElementById("variant").value = variant.id;
  document.getElementById("counter").textContent = `${variant.id} / 12`;
  document.getElementById("variant-caption").textContent = variant.lead;
  const url = new URL(location.href);
  url.searchParams.set("variant", variant.id);
  url.searchParams.delete("stage");
  try {
    window.history.replaceState(null, "", url);
  } catch {
    /* Local file viewers may disable URL changes. */
  }
  if (variant.id === "01") {
    const rail = app.querySelector(".subject-carousel");
    const chosen = rail.querySelector(`[data-subject="${state.subject}"]`);
    rail.scrollLeft = chosen.offsetLeft - rail.offsetLeft - (rail.clientWidth - chosen.clientWidth) / 2;
  }
  console.info("[JustStudy home prototype]", {
    variant: variant.id,
    scores: subjects.map((s) => ({ subject: s.name, score: s.score })),
    topic: getTopic()[0],
    ...state,
  });
}
function chooseSubject(id) {
  state.subject = id;
  state.source = "suggested";
  state.query = "";
  render();
}
function prepareTopic(subjectId, index, source = "explore") {
  state.subject = subjectId;
  state.topics[subjectId] = index;
  state.source = source;
  state.query = "";
  render();
}
function revisit(index, immediate = false) {
  const r = recentStudies[index];
  prepareTopic(r.subject, r.topic, "recent");
  if (immediate) startSession(r.subject);
  else {
    notice(`${getSubject(r.subject).topics[r.topic][0]} ready. Start a 1-hour session when you like.`);
    const target = document.querySelector(`[data-topic-zone="${r.subject}"]`);
    if (target) {
      const rect = target.getBoundingClientRect();
      if (rect.top < 50 || rect.bottom > window.innerHeight - 120) target.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }
}
function motionFrames() {
  if (variant.layout === "deck")
    return [
      { transform: "translateX(-12px) rotate(-2deg)", opacity: 0.3 },
      { transform: "translateX(0) rotate(0)", opacity: 1 },
    ];
  if (["rail", "dock", "return"].includes(variant.layout))
    return [
      { transform: "translateX(18px)", opacity: 0.25 },
      { transform: "translateX(0)", opacity: 1 },
    ];
  if (variant.layout === "workspace") return [{ opacity: 0.25 }, { opacity: 1 }];
  return [
    { transform: "translateY(12px)", opacity: 0.2 },
    { transform: "translateY(0)", opacity: 1 },
  ];
}
function drawTopic(subjectId) {
  if (randomizing) return;
  const s = getSubject(subjectId);
  const current = state.topics[s.id];
  const index = (current + 1 + Math.floor(Math.random() * (s.topics.length - 1))) % s.topics.length;
  prepareTopic(s.id, index, "random");
  if (!inputKeyboard && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    randomizing = true;
    const targets = document.querySelectorAll(`[data-motion-zone="${s.id}"]`);
    const zones = targets.length ? targets : document.querySelectorAll(`[data-topic-zone="${s.id}"]`);
    for (const zone of zones) zone.animate(motionFrames(), { duration: 240, easing: "cubic-bezier(.23,1,.32,1)" });
    for (const die of document.querySelectorAll(`[data-action="randomize"][data-for="${s.id}"] .icon`))
      die.animate([{ transform: "rotate(-65deg) scale(.8)" }, { transform: "rotate(0) scale(1)" }], {
        duration: 240,
        easing: "cubic-bezier(.23,1,.32,1)",
      });
    setTimeout(() => {
      randomizing = false;
    }, 240);
  }
  document.getElementById("announcement").textContent = `New topic in ${s.name}: ${getTopic(s)[0]}. Ready for a 1-hour focus session.`;
}
function changeVariant(id) {
  variant = variants.find((v) => v.id === id) || variants[0];
  render();
}
function cycle(direction) {
  changeVariant(String(((Number(variant.id) - 1 + direction + 12) % 12) + 1).padStart(2, "0"));
}
function notice(text) {
  const el = document.getElementById("notice");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    el.hidden = true;
  }, 3800);
}
function gallery() {
  document.getElementById("gallery-grid").innerHTML = variants
    .map(
      (v) =>
        `<button type="button" class="gallery-card ${variant.id === v.id ? "chosen" : ""}" data-variant="${v.id}"><div class="wireframe wire-${v.id}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="eyebrow">${v.id}</span><strong>${v.name}</strong><p>${v.lead}</p><span class="gallery-flow">${v.flow}</span></button>`,
    )
    .join("");
  document.getElementById("gallery").showModal();
}
function inspect() {
  document.getElementById("inspector").innerHTML =
    `<div class="dialog-top"><div><span class="eyebrow">Home · variante ${variant.id}</span><h2 id="inspector-title">${variant.name}</h2></div><button type="button" class="lab-icon" data-close="inspector" aria-label="Fechar detalhes">×</button></div><div class="inspect-section"><h3>Como o usuário interage</h3><p>${variant.flow}</p></div><div class="inspect-section"><h3>Decisão de UX</h3><p>${variant.why}</p></div><div class="inspect-section"><h3>Microinteração do sorteio</h3><p>${variant.motion} A troca é imediata por teclado ou com movimento reduzido.</p></div><div class="inspect-section"><h3>Trade-off</h3><p>${variant.trade}</p></div><div class="inspect-section"><h3>Estado atual</h3><dl><div><dt>Matéria</dt><dd>${getSubject().name}</dd></div><div><dt>Score da matéria</dt><dd>${getSubject().score}</dd></div><div><dt>Tema preparado</dt><dd>${getTopic()[0]}</dd></div><div><dt>Origem</dt><dd>${state.source}</dd></div><div><dt>Sessão de foco</dt><dd>${state.session ? "Iniciada" : "Não iniciada"}</dd></div></dl></div><p class="small">Protótipo descartável com dados demonstrativos. O score 203, as imagens, Inter e a paleta vêm da referência. Os demais scores e temas servem para testar a interação. Sem persistência ou chamadas ao backend.</p>`;
  document.getElementById("inspector").showModal();
}
function remainingTime() {
  if (!state.session) return 3600;
  return state.session.paused ? state.session.remaining : Math.max(0, Math.ceil((state.session.end - Date.now()) / 1000));
}
function sessionMarkup() {
  const ss = state.session;
  const s = getSubject(ss.subject);
  const t = s.topics[ss.topic];
  return `<div class="focus-dialog-header"><span class="eyebrow">Focus session · ${s.name}</span><button type="button" class="circle secondary" data-close="focus-session" aria-label="Back to home">×</button></div>${imageFor(s)}<h2 id="focus-title">${t[0]}</h2><p>${t[1]}</p><div class="timer" id="focus-timer" role="timer" aria-label="Time remaining">60:00</div><span class="focus-status" id="focus-status">Time to understand.</span><div class="focus-dialog-actions"><button type="button" class="pill secondary" data-action="pause" id="pause-session">${ic(ss.paused ? "play" : "pause")}${ss.paused ? "Resume" : "Pause"}</button><button type="button" class="pill primary" data-action="end-session">Finish session${ic("check")}</button></div><p class="focus-prototype">Preview · this session is kept only in this page.</p>`;
}
function startSession(id = state.subject) {
  if (state.session) {
    document.getElementById("focus-session").showModal();
    notice("Your current session is still active. Finish it before starting another topic.");
    return;
  }
  state.subject = id;
  state.session = { subject: id, topic: state.topics[id], end: Date.now() + 3600000, remaining: 3600, paused: false };
  document.getElementById("focus-session").innerHTML = sessionMarkup();
  document.getElementById("focus-session").showModal();
  document.getElementById("resume-session").hidden = false;
  tick();
}
function tick() {
  if (!state.session) return;
  const remaining = remainingTime();
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  document.getElementById("focus-timer").textContent = time;
  document.getElementById("resume-session").textContent = `${state.session.paused ? "Ⅱ" : "▶"} ${time} · Session`;
  document.getElementById("focus-status").textContent =
    remaining === 0 ? "Your hour is complete." : state.session.paused ? "Paused. Take a breath." : "Time to understand.";
  document.getElementById("pause-session").disabled = remaining === 0;
}
setInterval(tick, 1000);
function pauseSession() {
  const ss = state.session;
  if (ss.paused) {
    ss.end = Date.now() + ss.remaining * 1000;
    ss.paused = false;
  } else {
    ss.remaining = remainingTime();
    ss.paused = true;
  }
  document.getElementById("pause-session").innerHTML = `${ic(ss.paused ? "play" : "pause")}${ss.paused ? "Resume" : "Pause"}`;
  tick();
}
function endSession() {
  state.session = null;
  document.getElementById("focus-session").close();
  document.getElementById("resume-session").hidden = true;
  notice("Focus preview finished. Your scores are unchanged.");
}
function download() {
  const clone = document.documentElement.cloneNode(true);
  for (const dialog of clone.querySelectorAll("dialog")) {
    dialog.removeAttribute("open");
    if (dialog.id !== "gallery") dialog.innerHTML = "";
  }
  clone.querySelector("#app").innerHTML = "";
  clone.querySelector("#gallery-grid").innerHTML = "";
  clone.querySelector("#notice").hidden = true;
  clone.querySelector("#resume-session").hidden = true;
  const url = URL.createObjectURL(new Blob([`<!doctype html>\n${clone.outerHTML}`], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "juststudy-home-12-interactions.html";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const actionHandlers = {
  previous: () => cycle(-1),
  next: () => cycle(1),
  gallery,
  inspect,
  download,
  mobile: (el) => {
    const mobile = document.getElementById("surface").classList.toggle("mobile");
    el.setAttribute("aria-pressed", String(mobile));
  },
  randomize: (el) => drawTopic(el.dataset.for),
  start: (el) => startSession(el.dataset.for),
  "start-recent": (el) => revisit(Number(el.dataset.index), true),
  "topic-previous": () =>
    prepareTopic(state.subject, (state.topics[state.subject] + getSubject().topics.length - 1) % getSubject().topics.length),
  "topic-next": () => prepareTopic(state.subject, (state.topics[state.subject] + 1) % getSubject().topics.length),
  pause: pauseSession,
  "end-session": endSession,
  "resume-session": () => document.getElementById("focus-session").showModal(),
  home: () => {
    state.query = "";
    render();
  },
  account: () => notice("Account is outside this home exploration."),
  logout: () => notice("Signing out is outside this home exploration."),
};
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.close) {
    document.getElementById(button.dataset.close).close();
    return;
  }
  if (button.dataset.variant) {
    changeVariant(button.dataset.variant);
    document.getElementById("gallery").close();
    window.scrollTo({ top: 0 });
    return;
  }
  if (button.dataset.subject) {
    chooseSubject(button.dataset.subject);
    return;
  }
  if (button.dataset.recent !== undefined) {
    revisit(Number(button.dataset.recent));
    return;
  }
  if (button.dataset.topicIndex !== undefined) {
    prepareTopic(button.dataset.topicSubject, Number(button.dataset.topicIndex));
    return;
  }
  actionHandlers[button.dataset.action]?.(button);
});
document.addEventListener("change", (event) => {
  if (event.target.id === "variant") {
    changeVariant(event.target.value);
    window.scrollTo({ top: 0 });
  }
  if (event.target.id === "composer-subject") chooseSubject(event.target.value);
});
document.addEventListener("input", (event) => {
  if (event.target.id === "topic-search") {
    state.query = event.target.value;
    document.getElementById("search-results").innerHTML = searchResults();
  }
});
document.addEventListener("keydown", (event) => {
  inputKeyboard = true;
  document.body.classList.add("keyboard");
  if (event.target.id === "topic-search" && event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#search-results [data-topic-index]")?.click();
    return;
  }
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.target.closest("input,select,textarea,[contenteditable]") ||
    document.querySelector("dialog[open]")
  )
    return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    cycle(event.key === "ArrowLeft" ? -1 : 1);
  }
});
document.addEventListener("pointerdown", () => {
  inputKeyboard = false;
  document.body.classList.remove("keyboard");
});
window.addEventListener("popstate", () => changeVariant(new URLSearchParams(location.search).get("variant")));
document.getElementById("variant").innerHTML = variants.map((v) => `<option value="${v.id}">${v.id} · ${v.name}</option>`).join("");
render();
