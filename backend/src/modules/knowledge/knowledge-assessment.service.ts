import { z } from "zod";
import type { Ai } from "@/integrations/ai";
import type { Prompts } from "@/integrations/prompts";
import {
  KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT,
  KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT_VERSION,
  KNOWLEDGE_ASSESSMENT_PROMPT_LABEL,
  KNOWLEDGE_ASSESSMENT_PROMPT_NAME,
  KNOWLEDGE_ASSESSMENT_SYSTEM_PROMPT,
} from "@/prompts/knowledge/topic-assessment.prompt";
import { KNOWLEDGE_ASSESSMENT_VERSION } from "./knowledge.constant";
import type { KnowledgeAssessmentWriter } from "./knowledge.contract";

type KnowledgeAssessmentServiceInput = {
  ai: Ai;
  prompts: Prompts;
};

const generatedAssessmentSchema = z.object({
  reference_summary: z.string().min(1).max(900),
  key_concepts: z.array(z.string().min(1).max(200)).min(4).max(6),
  common_misconceptions: z.array(z.string().min(1).max(240)).min(2).max(4),
});

export function createKnowledgeAssessmentService(input: KnowledgeAssessmentServiceInput): KnowledgeAssessmentWriter {
  return {
    assessment: {
      async create(topic) {
        const prompt = await input.prompts.text.get({
          name: KNOWLEDGE_ASSESSMENT_PROMPT_NAME,
          label: KNOWLEDGE_ASSESSMENT_PROMPT_LABEL,
          fallback: KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT,
          fallback_version: KNOWLEDGE_ASSESSMENT_LOCAL_PROMPT_VERSION,
          variables: { subject: topic.subject.name, topic: topic.topic.name, level: topic.topic.level },
        });
        const result = await input.ai.structured.create({
          system: KNOWLEDGE_ASSESSMENT_SYSTEM_PROMPT,
          prompt: prompt.text,
          output: {
            schema: generatedAssessmentSchema,
            name: "topic_assessment",
            description: "Authoritative grading reference for one study topic",
          },
          temperature: 0,
          max_output_tokens: 1200,
          function_id: "knowledge.assessment.create",
          telemetry: {
            subject_slug: topic.subject.slug,
            topic_slug: topic.topic.slug,
            topic_level: topic.topic.level,
            prompt_version: prompt.version,
          },
        });

        return {
          assessment: { ...result.output, version: KNOWLEDGE_ASSESSMENT_VERSION },
          provider: result.provider,
          model: result.model,
          prompt_version: prompt.version,
        };
      },
    },
  };
}
