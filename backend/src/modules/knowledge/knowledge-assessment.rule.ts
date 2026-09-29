import type { KnowledgeAssessmentContext, KnowledgeTopic } from "./knowledge.contract";

const ASSESSMENT_CONTEXT_VERSION = "catalog-template-v1";

function createAssessmentContext(topic: KnowledgeTopic): KnowledgeAssessmentContext {
  const subject = topic.subject.name;
  const name = topic.topic.name;
  const level = topic.topic.level;

  return {
    ...topic,
    assessment: {
      reference_summary: `${name} must be explained accurately within ${subject} at the ${level} level. The explanation should define its scope, connect its central principles through a causal or logical sequence, use canonical methods or representations when relevant, and state important assumptions or limitations. Evaluate substance rather than speaking style.`,
      key_concepts: [
        `A precise definition and scope for ${name}`,
        `The central principles, mechanisms, or relationships that make ${name} work`,
        `A logically connected explanation rather than an isolated list of terms`,
        `A representative example, method, or application appropriate to the ${level} level`,
        `Important assumptions, limitations, or distinctions from adjacent concepts`,
      ],
      common_misconceptions: [
        `Confusing ${name} with a related concept from ${subject}`,
        `Naming components of ${name} without explaining how they are connected`,
        `Overgeneralizing a rule beyond the assumptions under which it is valid`,
        `Using a memorized example as if it were the definition of ${name}`,
      ],
      version: ASSESSMENT_CONTEXT_VERSION,
    },
  };
}

export const knowledgeAssessmentRule = {
  create: createAssessmentContext,
};
