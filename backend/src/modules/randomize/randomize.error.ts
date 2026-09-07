import { problemError } from "@/infrastructure/http/problem";

export const randomizeError = {
  subjectNotFound() {
    return problemError.create({
      status: 404,
      code: "RANDOMIZE_SUBJECT_NOT_FOUND",
      title: "Randomize subject not found",
      detail: "The requested subject does not exist in the knowledge catalog.",
    });
  },
  topicUnavailable() {
    return problemError.create({
      status: 409,
      code: "RANDOMIZE_TOPIC_UNAVAILABLE",
      title: "Randomize topic unavailable",
      detail: "No eligible topic is available for this randomization.",
    });
  },
};
