# JustStudy — 18 telas, três jornadas

Exploração de layout, navegação e UX baseada na tarefa **Implementar feedback e score**, em `docs/api.md`, em `docs/feedback-evaluation.md` e nos contratos e modelos atuais de knowledge, randomize, focus, feedback e score.

**Entrega para colar:** [juststudy-18-telas-paper.zip](juststudy-18-telas-paper.zip), com exatamente 18 HTMLs estáticos em artboards de 1.440 px. Os arquivos ficam em `paper/ritual`, `paper/estudio` e `paper/caderno`. Todos os estilos estão inline e não há scripts. Os protótipos interativos estão nas três pastas de mesmo nome fora de `paper/`.

Os dados pessoais, contagens, durações e scores são **exemplos**, não uma consulta ao banco. O exemplo de fotossíntese e a mudança 214 → 196 vêm da documentação do projeto; outros exemplos são fixtures editoriais compatíveis com os campos da API. A interface traduz nomes e níveis para português.

## Abrir e comparar

Abra `index.html` ou execute, na raiz do repositório:

```sh
python3 prototypes/juststudy-journeys/_source/serve.py
```

Acesse [o comparador local](http://127.0.0.1:4173/index.html). Escolha a tela no topo e a jornada no seletor inferior. Atalhos: **1–3**, **← / →**, **R** para recarregar. O formato mobile usa um frame de 390 px. A troca de jornada é instantânea e preserva a tela selecionada.

| Jornada | Eixo de exploração | Quando funciona bem | Custo |
| --- | --- | --- | --- |
| Ritual | Decisão sequencial, foco central, detalhes progressivos | Quem quer começar a estudar com pouca distração | Menos contexto simultâneo |
| Estúdio | Navegação persistente, painel e inspeção lado a lado | Quem alterna entre estudar, avaliar e consultar evolução | Mais densidade e mais escolhas visíveis |
| Caderno | Capítulos, tipografia editorial, leitura e reflexão | Quem valoriza uma experiência calma e revisão aprofundada | Mais rolagem e menos informação por área |

A espinha dorsal é a mesma porque segue os seis momentos solicitados e os contratos existentes. O que muda é a hierarquia, a navegação, a densidade, o papel do contexto e a apresentação da revisão.

## Os 18 arquivos de tela

Os arquivos desta tabela são a entrega para Paper: estilos inline, nenhuma dependência e nenhum JavaScript. Abra o código e cole no canvas do Paper. As versões interativas equivalentes ficam em `ritual/`, `estudio/` e `caderno/` fora de `paper/`; elas possuem HTML, CSS e JavaScript embutidos, sem build ou CDN.

| Tela | Ritual | Estúdio | Caderno |
| --- | --- | --- | --- |
| Login | [01-login.html](paper/ritual/01-login.html) | [01-login.html](paper/estudio/01-login.html) | [01-login.html](paper/caderno/01-login.html) |
| Escolher assunto / home | [02-home.html](paper/ritual/02-home.html) | [02-home.html](paper/estudio/02-home.html) | [02-home.html](paper/caderno/02-home.html) |
| Tema / abandonar / iniciar | [03-tema.html](paper/ritual/03-tema.html) | [03-tema.html](paper/estudio/03-tema.html) | [03-tema.html](paper/caderno/03-tema.html) |
| Focus | [04-focus.html](paper/ritual/04-focus.html) | [04-focus.html](paper/estudio/04-focus.html) | [04-focus.html](paper/caderno/04-focus.html) |
| Submit, feedback e estados | [05-feedback.html](paper/ritual/05-feedback.html) | [05-feedback.html](paper/estudio/05-feedback.html) | [05-feedback.html](paper/caderno/05-feedback.html) |
| Perfil, score e histórico | [06-perfil.html](paper/ritual/06-perfil.html) | [06-perfil.html](paper/estudio/06-perfil.html) | [06-perfil.html](paper/caderno/06-perfil.html) |

`index.html` é um comparador adicional, não uma das 18 telas. `_source/` contém o gerador e as fontes compartilhadas de autoria; esses arquivos não são dependências dos HTMLs entregues. `juststudy-18-telas-paper.zip` contém exatamente as 18 telas para Paper e um guia curto. O comparador e o mapa técnico ficam disponíveis nesta pasta.

## Levar ao Paper

Você pode abrir qualquer um dos 18 arquivos em `paper/`, copiar seu HTML completo e colar no canvas. O [Paper aceita somente estilos inline e ignora seletores CSS](https://paper.design/docs/paste/html); essa conversão já está feita nos arquivos entregues.

Para escolher outro estado ou formato:

1. Abra o comparador pelo servidor local.
2. Escolha jornada, tela, formato e, no feedback, o estado desejado.
3. Abra os detalhes que quiser incluir na composição.
4. Clique **Copiar para Paper**. O comparador prepara um fragmento da tela atual com estilos calculados embutidos e retira scripts, diálogos e controles do protótipo.
5. Cole no recurso de importação de HTML do Paper. Se o navegador bloquear a área de transferência, o comparador mostra o código para cópia manual.

**Baixar HTML** fornece o arquivo completo da tela, com os estados e interações. Para exportar o estado visível, use **Copiar para Paper**. Os arquivos também podem ser abertos em um editor para copiar o código. Não foi feita importação direta no Paper: a fidelidade final depende do suporte do importador a CSS, SVG e layout. A exportação usa formas vetoriais e fontes de sistema, sem assets externos.

**Salvar HTML Paper** grava a composição atual em `paper/<jornada>/<tela>.html` usando o servidor local. O arquivo de mesma tela é substituído por essa nova composição.

O comparador aberto por `file://` permite percorrer os arquivos; a cópia de estilos entre frames deve usar o servidor local por causa do isolamento de origem do navegador.

## Interações disponíveis

- Login Google demonstrativo, e-mail com validação, confirmação e reenvio, acesso visitante e saída com confirmação.
- Busca por assunto, seleção, sorteio dentro do assunto e surpresa entre os três assuntos de exemplo.
- Tema sorteado e dificuldade; escolha de 15, 25, 45 ou 60 minutos; confirmação de abandono.
- Focus com contador baseado em um instante final, conclusão antecipada e abandono. Não há pausa, pois a API não possui essa operação.
- Gravação simulada com início/fim; bloqueio de envio abaixo de três segundos; seleção de arquivo e validação local de formato/tamanho. Nenhum microfone é acessado e nenhum arquivo é enviado.
- Submit demonstrativo: estado de transcrição, `pending` e resultado. O áudio selecionado não é analisado; o resultado é uma fixture do assunto escolhido.
- Correções com link para trechos da transcrição, rubrica, mapa de conceitos, análise do raciocínio, roteiro e perguntas de revisão.
- Histórico com filtros e carregamento de mais um registro de exemplo; consultas de plano e detalhes em diálogos locais.
- Preferências mantidas em `sessionStorage`, separadas por jornada. As páginas também abrem individualmente com dados iniciais. Recarregar uma tela não autentica nem consulta a API.

A tela 05 abre com o **resultado** para facilitar a composição no Paper. Indo pelo fluxo de focus, ela abre em **gravação**. Há sete estados selecionáveis: gravação, processando, resultado parcial, sem evidência, falha, expirado e acesso Student. São estados da interface; apenas `active`, `pending`, `completed`, `failed` e `expired` são status persistidos. `insufficient` é um veredito dentro de `completed`; o bloqueio Student é um estado de acesso.

## Origem dos campos

| Tela | Endpoints existentes | Campos visíveis / derivados | Tabelas de origem |
| --- | --- | --- | --- |
| Login | `POST /v1/auth/anonymous`, `POST /v1/auth/magic-link`, `POST /v1/auth/google`, `GET /v1/auth/session` | `email`, `callback_url`; `accepted`, `redirect_url`; `name`, `email_verified`, `image`, `is_anonymous` | `users` e sessões da autenticação |
| Home | `GET /v1/knowledge/subjects`, `GET /v1/scores`, `GET /v1/focus/sessions/active`, `GET /v1/focus/sessions/history`, `GET /v1/billing/summary` | `slug`, `name`, `topic_count`, `level_counts`; `score`, contagens por assunto; último estudo; plano e créditos | `knowledge_subjects`, `knowledge_topics`, `subject_scores`, `focus_sessions`, `subscriptions` |
| Tema | `POST /v1/randomize/topic`, `POST /v1/focus/sessions` | `subject_slug`; `id`, `subject`, `topic.name`, `topic.level`; `randomization_id`, `duration_seconds` | `topic_randomizations`, `knowledge_topics`, `focus_sessions` |
| Focus | `GET /v1/focus/sessions/active`, `POST /v1/focus/sessions/:id/heartbeat`, `POST /v1/focus/sessions/:id/complete`, `POST /v1/focus/sessions/:id/abandon` | `status`, `duration_seconds`, `started_at`, `ends_at`, `last_seen_at`, `finished_at`; contador calculado por `ends_at` | `focus_sessions`, `topic_randomizations` |
| Submit e feedback | `POST /v1/feedback/sessions`, `POST /v1/feedback/sessions/:id/heartbeat`, `POST /v1/feedback/sessions/:id/submit`, `GET /v1/feedback/sessions/:id` | `focus_session_id`, `audio`; `recording_ends_at`, `upload_ends_at`, `status`, `error_code`; `transcript`, `evaluation`, `score_change` | `feedback_sessions`, `score_events`, `subject_scores` |
| Perfil e histórico | `GET /v1/auth/session`, `GET /v1/scores`, `GET /v1/focus/sessions/history`, `GET /v1/feedback/history`, `GET /v1/randomize/history`, `GET /v1/billing/summary`, `POST /v1/billing/portal`, `DELETE /v1/auth/session` | Nome, e-mail e verificação; score, nível certificado e provisório; estudos, duração planejada e real; plano, saldo e renovação | `users`, `subject_scores`, `focus_sessions`, `feedback_sessions`, `topic_randomizations`, `subscriptions` |

O endpoint de checkout (`POST /v1/billing/checkout`) alimenta a ação Student para usuários identificados sem o plano. Endpoints de saúde, ingestão administrativa do catálogo e webhook não pertencem às seis telas do estudante.

O perfil não possui um endpoint de edição: nome e e-mail aparecem como informação. O protótipo não inventa streak, ranking, seguidores, XP, upload de avatar, edição de perfil, aulas internas nem chat com a IA.

### Avaliação detalhada

- Resumo: `headline`, `summary`, `mastery` de 0–100 e `verdict`.
- Rubrica de 0–4: `factual_accuracy`, `coverage`, `conceptual_reasoning`, `clarity`. Domínio = 50% precisão + 30% cobertura + 20% raciocínio; clareza não entra no cálculo.
- Correções: `priority`, `student_claim`, `segment_id`, `correct_explanation`, `memory_hook`.
- Evidência: `transcript.segments[].id`, `start_ms`, `end_ms`, `text`. Os timestamps navegam no texto; não reproduzem áudio histórico.
- Revisão: `understanding_map`, `reasoning_analysis`, `strengths`, `improvement_plan`, `recommended_outline`, `follow_up_questions`.
- Score: `score_change.before`, `after`, `delta`, distinto da nota da explicação.
- Falta de evidência: `scorable=false`, `mastery=null`, `insufficient_reason`; score preservado.
- `depth`, `uncertainties`, feedback textual de cada critério e severidade das correções podem ampliar a apresentação em uma implementação; a composição atual prioriza os ajustes principais.
- IDs, versão do algoritmo, modelos de IA, versão de prompt, custos, tokens, tentativas, leases e idioma/confiança da transcrição são detalhes técnicos, não rótulos na jornada do estudante.

### Dependências e decisões a resolver na implementação

1. **Abandonar tema antes do focus:** a API atual não oferece abandono de `topic_randomizations` diretamente. O botão foi incluído por fazer parte do briefing, mas é somente uma simulação local. Será preciso definir uma operação de abandono de tema ou alterar essa decisão na jornada. O protótipo não cria e abandona uma sessão artificialmente para contornar o contrato.
2. **Conteúdo do estudo:** a API entrega nome e dificuldade do tema, não uma aula, material ou descrição pedagógica. Por isso a tela orienta usar o próprio material. A ilustração é decorativa, não conteúdo retornado pelo servidor.
3. **Gravação real:** em produção, usar captura de áudio, validar duração/fala no servidor, manter heartbeats a cada 30 segundos e respeitar os prazos recebidos. Neste pacote, captura e processamento são simulações.
4. **Feedback e acesso:** começar/enviar requer usuário identificado e Student ativo. O visitante pode sortear e focar; ao terminar, recebe o estado de acesso. O perfil individual ainda é uma composição ilustrativa; as rotas de dados protegidas precisam aplicar os guards reais na integração.
5. **Retentativas:** não há endpoint de reprocessamento manual de avaliação `failed`; consultar novamente apenas relê o resultado. Uma sessão expirada antes do submit pode ser reiniciada. Uma avaliação concluída/sem evidências não pode ser reenviada para o mesmo focus.
6. **Histórico combinado:** dados de focus e feedback devem ser associados por `focus_session_id`; o focus ativo exige recuperar assunto/tema pela randomização. O endpoint de histórico de focus já vem enriquecido.
7. **Contagens e totais:** quantidade de assuntos/temas pode ser derivada de `GET /v1/scores`. Tempo total de foco depende de percorrer o histórico paginado e somar `finished_at - started_at` das sessões concluídas. Não somar só a primeira página nem usar duração planejada como duração real.
8. **Gráficos e certificação:** `GET /v1/scores` fornece o estado atual, não uma série temporal. Mudanças históricas podem ser compostas do histórico completo de feedback. O estado provisório acaba após cinco temas distintos; o nível certificado não deve ser inferido apenas pelo número do score.
9. **Billing:** copiar dados de `summary`; usar `is_active` como autoridade. Os diálogos de plano são previews locais e não executam checkout, portal ou cobrança.

## Manutenção e verificação

Gerar novamente (Python 3.9 ou superior):

```sh
python3 prototypes/juststudy-journeys/_source/build.py
python3 prototypes/juststudy-journeys/_source/viewer.py
```

A superfície inteira está isolada em `prototypes/juststudy-journeys`. Nenhum arquivo de produção foi editado, nenhum banco foi consultado ou modificado, nenhum commit foi criado.

### Resultado da verificação

- 18 protótipos renderizados em desktop e em 390 px; sem overflow horizontal após os ajustes.
- Login de exemplo, seleção, duração, focus, gravação, submit, feedback, evidência e histórico exercitados no navegador.
- 18 arquivos para Paper conferidos: CSS inline, sem scripts/folhas de estilo, artboard de 1.440 px e controle de protótipo removido.
- Exportação de uma tela inspecionada visualmente no navegador; não houve edição/importação em um arquivo do Paper.
- Checagem da pasta dos protótipos: sem erros. Typecheck: aprovado. Testes existentes: 46 aprovados, 15 ignorados, 0 falhas.
- `bun run check` foi executado; a etapa global de formatação falha em arquivos preexistentes fora desta entrega. Os arquivos de produção não foram reformatados.
