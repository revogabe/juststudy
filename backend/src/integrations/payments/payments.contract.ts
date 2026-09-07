export type PaymentCustomer = {
  user_id: string;
  email: string;
};

export type PaymentSubscription = {
  subscription_id: string;
  product_id: string;
  status: string;
  period_ends_at: Date | null;
};

export type PaymentMeter = {
  credited_units: number;
  consumed_units: number;
};

export type PaymentEvent = {
  event_id: string;
  event_type: string;
  customer_id: string | null;
  user_id: string | null;
  subscriptions: readonly PaymentSubscription[];
  meters: readonly PaymentMeter[];
  payload: unknown;
};

export class InvalidPaymentEventError extends Error {
  constructor(cause?: unknown) {
    super("The payment event signature or payload is invalid", { cause });
    this.name = "InvalidPaymentEventError";
  }
}

export type Payments = {
  checkout: {
    create(customer: PaymentCustomer): Promise<{ checkout_url: string }>;
  };
  portal: {
    create(customer: PaymentCustomer): Promise<{ portal_url: string }>;
  };
  event: {
    create(input: { body: string; headers: Headers }): Promise<PaymentEvent>;
  };
};
