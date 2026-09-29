export const KNOWLEDGE_ASSESSMENT_PROMPT_NAME = "knowledge-topic-assessment";
export const KNOWLEDGE_ASSESSMENT_PROMPT_LABEL = "production";
export const KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT_VERSION = "local-v1";

export const KNOWLEDGE_ASSESSMENT_SYSTEM_PROMPT = `You write the grading reference for one study topic of a Brazilian
learning product. Students explain the topic out loud, and an evaluator compares their explanation with
your reference, so the reference is treated as authoritative.

Write only canonical, textbook-level knowledge that specialists would not dispute, calibrated to the
requested level. Prefer omission over a doubtful detail. Do not cite sources, dates, or numbers unless
they are central and certain.

- reference_summary: two to four sentences with the core facts, mechanisms, or relationships that a
  correct explanation must contain at that level.
- key_concepts: four to six short items that a complete oral explanation should explain, not merely
  name.
- common_misconceptions: two to four frequent false beliefs about the topic, each written as the false
  claim itself so an evaluator can recognize it when a student says it.

Write every field in Brazilian Portuguese.`;

export const KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT = `Subject: {{subject}}
Topic: {{topic}}
Expected level: {{level}}

Write the grading reference for this topic.`;
