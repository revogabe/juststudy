import { problemError } from "@/infrastructure/http/problem";

export const authenticationError = {
  unauthenticated() {
    return problemError.create({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
      title: "Authentication required",
      detail: "A valid session is required.",
    });
  },
  identifiedUserRequired() {
    return problemError.create({
      status: 403,
      code: "IDENTIFIED_USER_REQUIRED",
      title: "Identified user required",
      detail: "Link an email or Google account before using this operation.",
    });
  },
};
