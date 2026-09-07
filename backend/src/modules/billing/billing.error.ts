import { problemError } from "@/infrastructure/http/problem";

export const billingError = {
  providerUnavailable() {
    return problemError.create({
      status: 503,
      code: "PAYMENT_PROVIDER_UNAVAILABLE",
      title: "Payment provider unavailable",
      detail: "The payment provider could not complete the operation.",
    });
  },
  invalidEvent() {
    return problemError.create({
      status: 400,
      code: "INVALID_PAYMENT_EVENT",
      title: "Invalid payment event",
      detail: "The payment event signature or payload is invalid.",
    });
  },
  unlinkedCustomer() {
    return problemError.create({
      status: 422,
      code: "UNLINKED_PAYMENT_CUSTOMER",
      title: "Unlinked payment customer",
      detail: "The payment customer is not linked to a JustStudy user.",
    });
  },
};
