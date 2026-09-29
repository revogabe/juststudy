# JustStudy — 18 telas para Paper

3 jornadas × 6 telas, em artboards de 1.440 px. Cada HTML possui todos os estilos inline e nenhuma dependência de CSS, JavaScript, fonte ou imagem externa.

1. Escolha uma pasta: `ritual`, `estudio` ou `caderno`.
2. Abra o HTML desejado em um editor de texto.
3. Copie o código inteiro e cole no canvas do Paper.
4. Edite as camadas importadas como quiser.

O [Paper aceita HTML com estilos inline](https://paper.design/docs/paste/html). A fidelidade final depende da tradução de texto e SVG do importador; os arquivos foram inspecionados no navegador, sem importação direta no Paper.

| Jornada | Proposta | Custo |
| --- | --- | --- |
| Ritual | Uma decisão por vez, foco central e detalhes progressivos | Menos contexto simultâneo |
| Estúdio | Painel, navegação lateral e transcrição junto da avaliação | Mais densidade |
| Caderno | Capítulos editoriais, tipografia serifada e reflexão | Mais rolagem |

As seis telas de cada pasta:

- `01-login.html`
- `02-home.html`
- `03-tema.html`
- `04-focus.html`
- `05-feedback.html`
- `06-perfil.html`

Dados ilustrativos baseados nos contratos do JustStudy, não extraídos da conta real. O feedback principal usa o exemplo de fotossíntese da documentação: domínio 50/100 e score de Biologia 214 → 196. Score e domínio são medidas diferentes.

Estes arquivos são composições estáticas para design. O comparador interativo, os estados adicionais de feedback e o mapa de endpoints/campos estão em `prototypes/juststudy-journeys` no repositório.

Há uma lacuna importante no fluxo proposto: abandonar o tema antes do focus precisa de uma operação no backend; hoje existe apenas abandono de sessão de focus. O botão foi preservado como solicitado para permitir avaliar a jornada.
