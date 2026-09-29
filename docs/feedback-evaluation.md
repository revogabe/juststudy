# Feedback evaluation example

This example shows the student-facing depth of a completed evaluation. The transcript remains close
to spoken language; it is not rewritten into a polished answer. Stable segments let every correction
point back to what the student actually said and to the corresponding time in the recording.

## Transcribed explanation

```json
{
  "text": "Fotossíntese é o processo...",
  "language": "pt",
  "language_probability": 0.98,
  "duration_seconds": 84.6,
  "model": "turbo",
  "segments": [
    {
      "id": "segment-0001",
      "start_ms": 0,
      "end_ms": 15400,
      "text": "Fotossíntese é o processo em que as plantas usam luz, água e gás carbônico para produzir glicose e oxigênio."
    },
    {
      "id": "segment-0002",
      "start_ms": 15400,
      "end_ms": 30200,
      "text": "Ela acontece nos cloroplastos, e a clorofila captura a energia da luz."
    },
    {
      "id": "segment-0003",
      "start_ms": 30200,
      "end_ms": 48500,
      "text": "O oxigênio sai do gás carbônico quando a planta quebra o CO2, e a glicose guarda essa energia."
    },
    {
      "id": "segment-0004",
      "start_ms": 48500,
      "end_ms": 68100,
      "text": "Depois vem o ciclo de Calvin, que precisa receber luz diretamente para montar a glicose."
    },
    {
      "id": "segment-0005",
      "start_ms": 68100,
      "end_ms": 84600,
      "text": "Esse processo é importante porque coloca oxigênio no ambiente e cria matéria orgânica para a cadeia alimentar."
    }
  ]
}
```

## Completed API response

The wrapper also contains session timestamps and topic metadata. The evaluation portion would look
like this:

```json
{
  "status": "completed",
  "evaluation": {
    "language": "pt-BR",
    "scorable": true,
    "insufficient_reason": null,
    "mastery": 50,
    "verdict": "partial",
    "depth": "deep",
    "headline": "Você montou a visão geral, mas conectou incorretamente as duas etapas centrais.",
    "summary": "Você identificou reagentes, produtos, cloroplastos e a função ecológica da fotossíntese. O ponto que mais limita sua explicação é a origem do oxigênio e a relação entre as reações luminosas e o ciclo de Calvin. Corrigir essas duas conexões transforma uma lista correta de elementos em uma explicação causal.",
    "rubric": {
      "factual_accuracy": {
        "score": 2,
        "feedback": "A estrutura geral está correta, mas há dois erros conceituais importantes: o O2 liberado vem da água, e o ciclo de Calvin não usa luz diretamente.",
        "evidence": [
          {
            "segment_id": "segment-0003",
            "quote": "O oxigênio sai do gás carbônico"
          },
          {
            "segment_id": "segment-0004",
            "quote": "precisa receber luz diretamente"
          }
        ]
      },
      "coverage": {
        "score": 2,
        "feedback": "Você cobriu entradas, saídas, local e importância, mas não explicou fotólise da água, ATP, NADPH nem como as duas etapas se alimentam.",
        "evidence": [
          {
            "segment_id": "segment-0001",
            "quote": "usam luz, água e gás carbônico"
          }
        ]
      },
      "conceptual_reasoning": {
        "score": 2,
        "feedback": "Há uma sequência de etapas, porém a ligação causal entre captura de luz e fixação de carbono ficou incorreta.",
        "evidence": [
          {
            "segment_id": "segment-0002",
            "quote": "a clorofila captura a energia da luz"
          },
          {
            "segment_id": "segment-0004",
            "quote": "Depois vem o ciclo de Calvin"
          }
        ]
      },
      "clarity": {
        "score": 3,
        "feedback": "A explicação tem começo, etapas e consequência. Use os produtos de uma etapa como ponte explícita para a etapa seguinte.",
        "evidence": [
          {
            "segment_id": "segment-0005",
            "quote": "cria matéria orgânica para a cadeia alimentar"
          }
        ]
      }
    },
    "understanding_map": [
      {
        "concept": "Função geral da fotossíntese",
        "status": "correct",
        "feedback": "Você relacionou energia luminosa, produção de matéria orgânica e impacto ecológico."
      },
      {
        "concept": "Reações dependentes de luz",
        "status": "partial",
        "feedback": "Você reconheceu clorofila e luz, mas faltou explicar a geração de ATP e NADPH e a quebra da água."
      },
      {
        "concept": "Origem do oxigênio",
        "status": "incorrect",
        "feedback": "O oxigênio molecular liberado é formado a partir da água, não do CO2."
      },
      {
        "concept": "Ciclo de Calvin",
        "status": "partial",
        "feedback": "Você identificou a etapa, mas atribuiu a ela uso direto de luz em vez do uso de ATP e NADPH."
      }
    ],
    "reasoning_analysis": {
      "observed_approach": "Você organizou a explicação como entradas e produtos, local celular, duas etapas e importância ambiental.",
      "what_worked": [
        "Começar pelas entradas e saídas deu uma visão geral útil.",
        "Localizar o processo no cloroplasto conectou estrutura e função.",
        "Terminar com a cadeia alimentar mostrou que você entende a consequência biológica."
      ],
      "where_it_broke": [
        {
          "step": "Da captura de luz para a liberação de oxigênio",
          "problem": "Você atribuiu o oxigênio à quebra do CO2.",
          "consequence": "Isso troca o papel da água pelo do carbono e impede entender as reações luminosas.",
          "better_connection": "A luz impulsiona a transferência de elétrons; a água repõe esses elétrons e libera O2."
        },
        {
          "step": "Das reações luminosas para o ciclo de Calvin",
          "problem": "Você disse que o ciclo recebe luz diretamente.",
          "consequence": "Fica sem explicação como a energia luminosa chega à fixação de carbono.",
          "better_connection": "As reações luminosas produzem ATP e NADPH; o ciclo de Calvin usa essas moléculas para fixar CO2."
        }
      ]
    },
    "corrections": [
      {
        "priority": 1,
        "severity": "important",
        "student_claim": "O oxigênio sai do gás carbônico quando a planta quebra o CO2.",
        "segment_id": "segment-0003",
        "why_it_is_incorrect": "O carbono do CO2 é incorporado às moléculas orgânicas. O O2 liberado resulta da oxidação da água nas reações luminosas.",
        "correct_explanation": "No fotossistema II, a água fornece elétrons e prótons e libera oxigênio molecular como subproduto.",
        "memory_hook": "O oxigênio que sai vem da água que entra."
      },
      {
        "priority": 2,
        "severity": "important",
        "student_claim": "O ciclo de Calvin precisa receber luz diretamente.",
        "segment_id": "segment-0004",
        "why_it_is_incorrect": "O ciclo não absorve fótons diretamente; ele depende dos transportadores produzidos na etapa luminosa.",
        "correct_explanation": "O ciclo de Calvin usa ATP e NADPH para reduzir carbono e formar precursores de açúcares.",
        "memory_hook": "A luz carrega as baterias; Calvin usa as baterias."
      }
    ],
    "strengths": [
      {
        "title": "Boa visão do sistema",
        "detail": "Você reuniu reagentes, produto energético, organela e função ecológica numa única explicação.",
        "evidence_segment_ids": ["segment-0001", "segment-0002", "segment-0005"]
      }
    ],
    "improvement_plan": [
      {
        "step": 1,
        "action": "Desenhe duas caixas: reações luminosas e ciclo de Calvin; ligue-as com ATP e NADPH.",
        "success_criterion": "Você consegue dizer o que entra e sai de cada caixa sem consultar material."
      },
      {
        "step": 2,
        "action": "Explique em 30 segundos de onde vêm o O2 e o carbono da matéria orgânica.",
        "success_criterion": "Você menciona água como origem do O2 e CO2 como origem do carbono."
      },
      {
        "step": 3,
        "action": "Grave novamente uma explicação usando cada produto como ponte para a etapa seguinte.",
        "success_criterion": "A sequência luz → ATP/NADPH → fixação de CO2 aparece sem saltos."
      }
    ],
    "recommended_outline": [
      "Objetivo energético e reagentes do processo",
      "Onde ocorrem as duas etapas",
      "Como luz e água geram O2, ATP e NADPH",
      "Como ATP e NADPH permitem fixar CO2",
      "Produtos e importância biológica"
    ],
    "follow_up_questions": [
      {
        "question": "Se o oxigênio não vem do CO2, qual reagente fornece seus átomos?",
        "purpose": "Verificar se a correção sobre a fotólise da água foi incorporada."
      },
      {
        "question": "Como a energia capturada pela clorofila chega ao ciclo de Calvin?",
        "purpose": "Verificar a ligação causal entre as duas etapas."
      }
    ],
    "uncertainties": []
  },
  "score_change": {
    "subject_slug": "biology",
    "before": 214,
    "after": 196,
    "delta": -18,
    "algorithm_version": "ordinal_bayes_v1"
  }
}
```

The example intentionally gives the student more than a grade. It shows what was understood, which
specific connection failed, why that failure matters, how to reconstruct the reasoning, and how to
verify the correction. It does not reveal hidden model reasoning or replace the student's work with
a complete model answer.
