(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const variant = document.body.dataset.variant;
  const page = document.body.dataset.page;
  const key = `juststudy-prototype-${variant}`;
  let saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(key) || "{}");
  } catch {}
  const persist = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(saved));
    } catch {}
  };
  const fixture = {
    biology: {
      name: "Biologia",
      topic: "Fotossíntese",
      level: "Intermediário",
      before: 214,
      after: 196,
      mastery: 50,
      verdict: "Entendimento parcial",
      rubric: [2, 2, 2, 3],
      headline: "Você viu o todo. Agora, conecte as etapas.",
      summary:
        "Você identificou os elementos principais. Revisar a origem do oxigênio e a relação entre as etapas vai deixar sua explicação mais consistente.",
      corrections: [
        [
          "A origem do oxigênio",
          "O oxigênio sai do gás carbônico…",
          "O oxigênio liberado vem da água, nas reações luminosas. O carbono do CO₂ é incorporado à matéria orgânica.",
          "O oxigênio que sai vem da água que entra.",
        ],
        [
          "A ponte para o ciclo de Calvin",
          "O ciclo de Calvin precisa receber luz diretamente.",
          "O ciclo de Calvin usa ATP e NADPH produzidos nas reações luminosas. Ele não absorve luz diretamente.",
          "A luz carrega as baterias; Calvin usa as baterias.",
        ],
      ],
      segments: [
        "Fotossíntese é o processo em que as plantas usam luz, água e gás carbônico para produzir glicose e oxigênio.",
        "Ela acontece nos cloroplastos, e a clorofila captura a energia da luz.",
        "O oxigênio sai do gás carbônico quando a planta quebra o CO2, e a glicose guarda essa energia.",
        "Depois vem o ciclo de Calvin, que precisa receber luz diretamente para montar a glicose.",
        "Esse processo é importante porque coloca oxigênio no ambiente e cria matéria orgânica para a cadeia alimentar.",
      ],
      concepts: ["Função geral da fotossíntese", "Reações dependentes de luz", "Origem do oxigênio", "Ciclo de Calvin"],
      strengthTitle: "Boa visão do sistema",
      strength: "Você reuniu reagentes, cloroplastos e importância ecológica numa explicação com começo e consequência.",
      reasoning:
        "Você organizou a explicação por entradas, produtos, local e importância. A conexão se perdeu ao atribuir o O₂ ao CO₂ e ao dizer que Calvin usa luz diretamente.",
      better: "A luz alimenta as reações que geram ATP e NADPH; essas moléculas levam energia ao ciclo de Calvin.",
      plan: "Desenhe duas caixas: reações luminosas e ciclo de Calvin. Ligue-as com ATP e NADPH.",
      criterion: "Explique o que entra e sai de cada caixa sem consultar.",
      outline: [
        "Objetivo energético e reagentes do processo.",
        "Onde ocorrem as duas etapas.",
        "Como luz e água geram O₂, ATP e NADPH.",
        "Como ATP e NADPH permitem fixar CO₂.",
        "Produtos e importância biológica.",
      ],
      questions: [
        "Se o oxigênio não vem do CO₂, qual reagente fornece seus átomos?",
        "Como a energia capturada pela clorofila chega ao ciclo de Calvin?",
      ],
    },
    mathematics: {
      name: "Matemática",
      topic: "Sistemas lineares",
      level: "Intermediário",
      before: 342,
      after: 366,
      mastery: 50,
      verdict: "Entendimento parcial",
      rubric: [2, 2, 2, 3],
      headline: "O método ficou claro. As possibilidades, nem tanto.",
      summary: "Você mostrou como combinar equações. Agora, diferencie os casos em que o sistema tem uma, nenhuma ou infinitas soluções.",
      corrections: [
        [
          "Nem todo sistema tem solução única",
          "Duas equações sempre dão uma resposta.",
          "Retas distintas e paralelas não se encontram; retas coincidentes representam infinitas soluções.",
          "Duas equações, três possibilidades.",
        ],
        [
          "Interprete o resultado da eliminação",
          "Se tudo cancela, a solução é zero.",
          "Uma igualdade como 0 = 0 indica dependência; 0 = 5 indica incompatibilidade.",
          "Zero igual a zero é uma identidade, não uma incógnita resolvida.",
        ],
      ],
      segments: [
        "Um sistema linear reúne equações com as mesmas incógnitas.",
        "Podemos multiplicar e somar equações para eliminar uma variável.",
        "Duas equações sempre dão uma resposta.",
        "Se tudo cancela, a solução é zero.",
        "Depois de encontrar os valores eu substituo nas equações para conferir.",
      ],
      concepts: ["Equações e incógnitas", "Método de eliminação", "Existência de soluções", "Equações dependentes"],
      strengthTitle: "Você conferiu o resultado",
      strength: "Substituir os valores nas equações originais é uma boa forma de verificar sua solução.",
      reasoning: "Você explicou um procedimento útil, mas generalizou o caso de uma solução para todos os sistemas.",
      better: "Use o resultado da eliminação para distinguir equações independentes, dependentes e incompatíveis.",
      plan: "Desenhe dois pares de retas: paralelas e coincidentes. Escreva o sistema correspondente a cada par.",
      criterion: "Explique por que cada par tem nenhuma ou infinitas soluções.",
      outline: [
        "O que um sistema representa.",
        "A relação entre equações e retas.",
        "Um exemplo de eliminação.",
        "Os três tipos de solução.",
        "Verificação por substituição.",
      ],
      questions: ["O que significa chegar a 0 = 5 durante a eliminação?", "Como reconhecer duas equações que representam a mesma reta?"],
    },
    physics: {
      name: "Física",
      topic: "Conservação de energia",
      level: "Intermediário",
      before: 180,
      after: 208,
      mastery: 50,
      verdict: "Entendimento parcial",
      rubric: [2, 2, 2, 3],
      headline: "A energia se transforma. Acompanhe para onde ela vai.",
      summary:
        "Você conectou altura e movimento. Falta distinguir conservação da energia total e da energia mecânica quando existe atrito.",
      corrections: [
        [
          "O papel do atrito",
          "Com atrito a energia deixa de existir.",
          "O atrito transforma parte da energia mecânica em energia interna. A energia total é conservada ao incluir o ambiente.",
          "Energia dissipada também é energia.",
        ],
        [
          "Escolha os limites do sistema",
          "A energia mecânica sempre fica igual.",
          "A energia mecânica só é conservada quando o trabalho das forças não conservativas é nulo.",
          "Antes de conservar, defina o sistema.",
        ],
      ],
      segments: [
        "Energia pode ser transferida e mudar de forma.",
        "Um objeto no alto tem energia potencial e ganha energia cinética ao cair.",
        "Com atrito a energia deixa de existir.",
        "A energia mecânica sempre fica igual.",
        "Podemos comparar os estados inicial e final para estudar o movimento.",
      ],
      concepts: ["Transformações de energia", "Potencial e cinética", "Energia dissipada", "Limites do sistema"],
      strengthTitle: "Uma comparação útil",
      strength: "Comparar os estados inicial e final ajuda a enxergar a transformação de energia ao longo do movimento.",
      reasoning: "Você partiu de um exemplo concreto, mas confundiu energia mecânica com a energia total do sistema.",
      better: "Inclua a energia interna e o ambiente no balanço para explicar o efeito do atrito.",
      plan: "Compare uma descida com e sem atrito. Liste as formas de energia presentes em cada caso.",
      criterion: "Explique por que a energia mecânica pode diminuir sem que a energia total desapareça.",
      outline: [
        "Definir o sistema.",
        "Identificar as formas de energia.",
        "Comparar os estados inicial e final.",
        "Incluir o trabalho das forças não conservativas.",
        "Interpretar o balanço de energia.",
      ],
      questions: ["Para onde vai a energia mecânica perdida pelo atrito?", "Quando podemos usar conservação da energia mecânica?"],
    },
  };
  let subject = fixture[saved.subject] ? saved.subject : "biology";
  let duration = saved.duration || 25;
  const text = (selector, value) => {
    for (const el of $$(selector)) el.textContent = value;
  };
  function fill() {
    const d = fixture[subject];
    text("[data-subject-name]", d.name);
    text("[data-topic-name]", d.topic);
    text("[data-level]", d.level);
    text("[data-duration-label]", duration);
    text("[data-before]", d.before);
    text("[data-after]", d.after);
    text("[data-delta]", `${d.after >= d.before ? "+" : "−"}${Math.abs(d.after - d.before)}`);
    text("[data-mastery]", d.mastery);
    text("[data-verdict]", d.verdict);
    text("[data-headline]", d.headline);
    text("[data-summary]", d.summary);
    text("[data-strength-title]", d.strengthTitle);
    text("[data-strength]", d.strength);
    text("[data-reasoning]", d.reasoning);
    text("[data-better]", d.better);
    text("[data-plan]", d.plan);
    text("[data-criterion]", d.criterion);
    for (const [i, row] of d.corrections.entries()) {
      text(`[data-correction-title="${i}"]`, row[0]);
      text(`[data-claim="${i}"]`, `“${row[1]}”`);
      text(`[data-correction="${i}"]`, row[2]);
      text(`[data-memory="${i}"]`, row[3]);
    }
    for (const [i, value] of d.segments.entries()) text(`[data-segment="${i}"]`, value);
    for (const [i, value] of d.concepts.entries()) text(`[data-concept="${i}"]`, value);
    for (const [i, value] of d.questions.entries()) text(`[data-question="${i}"]`, value);
    for (const outline of $$("[data-outline]")) {
      outline.replaceChildren(
        ...d.outline.map((value) => {
          const li = document.createElement("li");
          li.textContent = value;
          return li;
        }),
      );
    }
    for (const el of $$("[data-subject]")) el.setAttribute("aria-pressed", String(el.dataset.subject === subject));
    for (const el of $$("[data-duration]")) el.setAttribute("aria-pressed", String(Number(el.dataset.duration) === duration));
  }
  fill();
  if (page === "perfil" && saved.lastResult && fixture[saved.lastResult]) {
    const last = fixture[saved.lastResult];
    for (const card of $$("[data-profile-subject]")) {
      const name = card.dataset.profileSubject;
      const slug = Object.keys(fixture).find((item) => fixture[item].name === name);
      const d = fixture[slug];
      const isLast = slug === saved.lastResult;
      const score = isLast ? d.after : d.before;
      const count = { biology: 3, mathematics: 4, physics: 1 }[slug] + (isLast ? 1 : 0);
      card.querySelector("[data-profile-score]").textContent = score;
      card.querySelector(".progress span").style.width = `${score / 10}%`;
      card.querySelector("[data-profile-evaluations]").textContent = `${count} temas distintos · ${count} avaliações`;
      card.querySelector(".badge").textContent = count >= 5 ? "Consolidado" : "Provisório";
      card.querySelector("[data-profile-provisional]").textContent =
        count >= 5
          ? "Estimativa apoiada em 5 temas distintos"
          : `${5 - count} ${5 - count === 1 ? "tema" : "temas"} para firmar a estimativa`;
    }
    const row = $("#history-list .history-row");
    row.querySelector(".grow strong").textContent = last.topic;
    row.querySelector(".grow p").textContent = `${last.name} · ${last.level} · Hoje, 09:25`;
    row.querySelector(".badge").textContent = `${last.after >= last.before ? "+" : "−"}${Math.abs(last.after - last.before)}`;
  }
  const go = (file, params = "") => {
    location.href = `${file}.html${params}`;
  };
  let toastTimeout;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.hidden = true;
    }, 4500);
  }
  function info(title, message) {
    $("#info-title").textContent = title;
    $("#info-copy").textContent = message;
    $("#info-dialog").showModal();
  }
  function confirmAction(title, copy, action) {
    $("#dialog-title").textContent = title;
    $("#dialog-copy").textContent = copy;
    $("#dialog-confirm").onclick = action;
    $("#confirm-dialog").showModal();
  }
  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  let recordStarted = 0;
  let recordedSeconds = 0;
  let recording = false;
  let recordTicker;
  let evaluationTimeout;
  let feedbackDeadline = Date.now() + 900000;
  function setState(state) {
    const allowed = ["active", "pending", "completed", "insufficient", "failed", "expired", "locked"];
    if (!allowed.includes(state)) state = "completed";
    clearTimeout(evaluationTimeout);
    if (state !== "active") {
      recording = false;
      clearInterval(recordTicker);
    }
    for (const el of $$("[data-feedback-panel]")) el.hidden = el.dataset.feedbackPanel !== state;
    for (const el of $$("[data-state]")) el.setAttribute("aria-pressed", String(el.dataset.state === state));
    const url = new URL(location);
    url.searchParams.set("state", state);
    history.replaceState(null, "", url);
    if (state === "active") {
      $("[data-action='record']").textContent = recordedSeconds ? "Gravar novamente" : "Começar gravação";
    }
  }
  if (page === "feedback") setState(new URLSearchParams(location.search).get("state") || "completed");
  if (page === "focus") {
    if (!saved.focusEnd || saved.focusEnd < Date.now()) {
      saved.focusEnd = Date.now() + (duration * 60 - 23) * 1000;
      persist();
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((saved.focusEnd - Date.now()) / 1000));
      text("#focus-timer", formatTime(remaining));
      if (!remaining) {
        clearInterval(focusTicker);
        saved.focusEnd = null;
        persist();
        go("05-feedback", saved.guest ? "?state=locked" : "?state=active");
      }
    };
    const focusTicker = setInterval(tick, 1000);
    tick();
  }
  function finishRecording() {
    recording = false;
    clearInterval(recordTicker);
    recordedSeconds = Math.min(900, Math.floor((Date.now() - recordStarted) / 1000));
    text("#record-time", formatTime(recordedSeconds));
    text("#record-label", recordedSeconds >= 3 ? "Gravação pronta para enviar" : "Grave pelo menos 3 segundos de explicação.");
    $("#submit-audio").disabled = recordedSeconds < 3;
    $("[data-action='record']").textContent = "Gravar novamente";
  }
  document.addEventListener("click", (event) => {
    const subjectButton = event.target.closest("[data-subject]");
    if (subjectButton) {
      subject = subjectButton.dataset.subject;
      saved.subject = subject;
      persist();
      fill();
      if (page === "perfil" && saved.lastResult && fixture[saved.lastResult]) {
        const last = fixture[saved.lastResult];
        for (const card of $$("[data-profile-subject]")) {
          const name = card.dataset.profileSubject;
          const slug = Object.keys(fixture).find((item) => fixture[item].name === name);
          const d = fixture[slug];
          const isLast = slug === saved.lastResult;
          const score = isLast ? d.after : d.before;
          const count = { biology: 3, mathematics: 4, physics: 1 }[slug] + (isLast ? 1 : 0);
          card.querySelector("[data-profile-score]").textContent = score;
          card.querySelector(".progress span").style.width = `${score / 10}%`;
          card.querySelector("[data-profile-evaluations]").textContent = `${count} temas distintos · ${count} avaliações`;
          card.querySelector(".badge").textContent = count >= 5 ? "Consolidado" : "Provisório";
          card.querySelector("[data-profile-provisional]").textContent =
            count >= 5
              ? "Estimativa apoiada em 5 temas distintos"
              : `${5 - count} ${5 - count === 1 ? "tema" : "temas"} para firmar a estimativa`;
        }
        const row = $("#history-list .history-row");
        row.querySelector(".grow strong").textContent = last.topic;
        row.querySelector(".grow p").textContent = `${last.name} · ${last.level} · Hoje, 09:25`;
        row.querySelector(".badge").textContent = `${last.after >= last.before ? "+" : "−"}${Math.abs(last.after - last.before)}`;
      }
    }
    const durationButton = event.target.closest("[data-duration]");
    if (durationButton) {
      duration = Number(durationButton.dataset.duration);
      saved.duration = duration;
      persist();
      fill();
      if (page === "perfil" && saved.lastResult && fixture[saved.lastResult]) {
        const last = fixture[saved.lastResult];
        for (const card of $$("[data-profile-subject]")) {
          const name = card.dataset.profileSubject;
          const slug = Object.keys(fixture).find((item) => fixture[item].name === name);
          const d = fixture[slug];
          const isLast = slug === saved.lastResult;
          const score = isLast ? d.after : d.before;
          const count = { biology: 3, mathematics: 4, physics: 1 }[slug] + (isLast ? 1 : 0);
          card.querySelector("[data-profile-score]").textContent = score;
          card.querySelector(".progress span").style.width = `${score / 10}%`;
          card.querySelector("[data-profile-evaluations]").textContent = `${count} temas distintos · ${count} avaliações`;
          card.querySelector(".badge").textContent = count >= 5 ? "Consolidado" : "Provisório";
          card.querySelector("[data-profile-provisional]").textContent =
            count >= 5
              ? "Estimativa apoiada em 5 temas distintos"
              : `${5 - count} ${5 - count === 1 ? "tema" : "temas"} para firmar a estimativa`;
        }
        const row = $("#history-list .history-row");
        row.querySelector(".grow strong").textContent = last.topic;
        row.querySelector(".grow p").textContent = `${last.name} · ${last.level} · Hoje, 09:25`;
        row.querySelector(".badge").textContent = `${last.after >= last.before ? "+" : "−"}${Math.abs(last.after - last.before)}`;
      }
    }
    const stateButton = event.target.closest("[data-state]");
    if (stateButton) {
      setState(stateButton.dataset.state);
    }
    const evidence = event.target.closest("[data-evidence]");
    if (evidence) {
      event.preventDefault();
      const panel = $("[data-feedback-panel='completed']");
      const segment = panel.querySelector(`#${evidence.dataset.evidence}`);
      segment.closest("details").open = true;
      segment.scrollIntoView({ block: "center" });
      segment.style.background = "var(--warm)";
      toast("Trecho da transcrição destacado.");
    }
    const filter = event.target.closest("[data-history-filter]");
    if (filter) {
      for (const el of $$("[data-history-filter]")) el.setAttribute("aria-pressed", String(el === filter));
      for (const row of $$("[data-history-status]"))
        row.hidden = filter.dataset.historyFilter !== "all" && filter.dataset.historyFilter !== row.dataset.historyStatus;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "randomize" || action === "surprise") {
      if (action === "surprise") subject = Object.keys(fixture)[Math.floor(Math.random() * 3)];
      saved.subject = subject;
      persist();
      go("03-tema");
    } else if (action === "start-focus") {
      saved.subject = subject;
      saved.duration = duration;
      saved.focusEnd = Date.now() + duration * 60000;
      persist();
      go("04-focus");
    } else if (action === "complete-focus") {
      saved.focusEnd = null;
      persist();
      go("05-feedback", saved.guest ? "?state=locked" : "?state=active");
    } else if (action === "abandon-topic" || action === "abandon-focus") {
      confirmAction(
        action === "abandon-topic" ? "Deixar este tema para depois?" : "Abandonar a sessão de foco?",
        "Este estudo não terá avaliação nem alteração de score. Você poderá escolher um novo assunto.",
        () => {
          saved.focusEnd = null;
          persist();
          go("02-home");
        },
      );
    } else if (action === "close-dialog") $("#confirm-dialog").close();
    else if (action === "close-info") $("#info-dialog").close();
    else if (action === "google" || action === "login") {
      saved.guest = false;
      persist();
      go("02-home");
    } else if (action === "guest") {
      saved.guest = true;
      persist();
      go("02-home");
    } else if (action === "resend") toast("Link reenviado na demonstração. Nenhum e-mail real foi enviado.");
    else if (action === "logout") {
      confirmAction("Sair da sua conta?", "Você voltará para a tela de entrada.", () => {
        saved = {};
        persist();
        go("01-login");
      });
      $("dialog #dialog-confirm").textContent = "Sair";
    } else if (action === "record") {
      if (recording) {
        finishRecording();
        return;
      }
      if (Date.now() >= feedbackDeadline) {
        setState("expired");
        return;
      }
      recording = true;
      recordedSeconds = 0;
      recordStarted = Date.now();
      $("#submit-audio").disabled = true;
      button.textContent = "Finalizar gravação";
      text("#record-label", "Gravação de exemplo em andamento");
      recordTicker = setInterval(() => {
        const seconds = Math.floor((Date.now() - recordStarted) / 1000);
        text("#record-time", formatTime(Math.min(seconds, 900)));
        if (Date.now() >= feedbackDeadline || seconds >= 900) finishRecording();
      }, 1000);
    } else if (action === "submit") {
      button.disabled = true;
      text("#record-label", "Transcrevendo seu áudio…");
      evaluationTimeout = setTimeout(() => {
        setState("pending");
        evaluationTimeout = setTimeout(() => {
          setState("completed");
          saved.lastResult = subject;
          persist();
        }, 2400);
      }, 1200);
    } else if (action === "show-transcript") {
      const el = $("#pending-transcript");
      el.hidden = !el.hidden;
      button.textContent = el.hidden ? "Ver transcrição" : "Ocultar transcrição";
    } else if (action === "refresh-feedback") toast("A avaliação continua indisponível. Sua transcrição está preservada.");
    else if (action === "restart-feedback") {
      feedbackDeadline = Date.now() + 900000;
      recordedSeconds = 0;
      $("#submit-audio").disabled = true;
      text("#record-time", "00:00");
      text("#record-label", "Nova explicação · até 15 minutos");
      setState("active");
    } else if (action === "plan" || action === "billing") {
      info(
        "Seu plano Student",
        "1.000 créditos no período, 875 disponíveis. No produto, este botão abre o checkout ou o portal de assinatura. Esta demonstração não realiza cobrança nem abre uma conta externa.",
      );
    } else if (action === "history-detail") {
      info(
        button.dataset.historyTitle,
        button.dataset.historyTitle === "Equações lineares"
          ? "Sessão abandonada em 05 de setembro, às 14:32. Duração real: 12 minutos; duração planejada: 25 minutos. Sem feedback e sem mudança de score."
          : `${button.dataset.historyTitle} · Estudo concluído. Aqui você pode revisitar a duração, a transcrição e a avaliação recebida. Este registro usa dados de exemplo para explorar a navegação do histórico.`,
      );
    } else if (action === "load-history") {
      const row = document.createElement("div");
      row.className = "history-row";
      row.dataset.historyStatus = "completed";
      row.innerHTML =
        '<div class="grow"><strong class="small">Funções e gráficos</strong><p class="small">Matemática · 03 set, 09:00</p></div><div class="right"><strong class="small">45 min</strong><p class="small">80/100</p></div><span class="badge">+36</span>';
      const currentFilter = $("[data-history-filter][aria-pressed='true']").dataset.historyFilter;
      row.hidden = currentFilter === "abandoned";
      $("#history-list").append(row);
      button.textContent = "Todos os estudos carregados";
      button.disabled = true;
    }
  });
  $("[data-form='login']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    text("[data-email]", $("#email").value);
    $(".login-grid").hidden = true;
    $("#login-sent").hidden = false;
    $("#login-sent").style.maxWidth = "650px";
    $("#login-sent").style.margin = "70px auto";
  });
  $("#subject-search")?.addEventListener("input", (event) => {
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const q = normalize(event.target.value);
    for (const el of $$("[data-subject]")) el.hidden = !normalize(el.textContent).includes(q);
    $("#no-results").hidden = $$("[data-subject]").some((el) => !el.hidden);
  });
  $("#audio-file")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 32 * 1024 * 1024 || !/\.(webm|ogg|opus|mp4|m4a|mp3|mpeg|aac|wav)$/i.test(file.name)) {
      text("#audio-file-label", "Escolha um formato aceito com até 32 MiB.");
      $("#submit-audio").disabled = true;
      return;
    }
    text("#audio-file-label", `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MiB`);
    text("#record-label", "Arquivo selecionado. O envio usa o feedback de exemplo.");
    $("#submit-audio").disabled = false;
  });
  if (saved.guest && page !== "login" && page !== "feedback") {
    const note = document.createElement("div");
    note.className = "card mb";
    const copy = document.createElement("p");
    copy.className = "small";
    copy.textContent = "Você está explorando como visitante. Entre para acessar seu perfil, score e feedback Student.";
    const signIn = document.createElement("a");
    signIn.href = "01-login.html";
    signIn.className = "text-link";
    signIn.textContent = "Entrar na minha conta →";
    note.append(copy, signIn);
    $("#main").prepend(note);
  }
  if (window.parent !== window) window.parent.postMessage({ type: "juststudy-page", page, variant }, location.origin);
})();
