export type IdentityUser = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  image: string | null;
  is_anonymous: boolean;
};

export type IdentitySession = {
  id: string;
  user_id: string;
  expires_at: Date;
};

export type IdentitySessionContext = {
  user: IdentityUser;
  session: IdentitySession;
};

export type IdentityResponse<Body> = {
  body: Body;
  headers: Headers;
};

export type Identity = {
  anonymous: {
    create(headers: Headers): Promise<IdentityResponse<{ user: IdentityUser }>>;
  };
  magicLink: {
    create(input: {
      headers: Headers;
      email: string;
      callback_url: string;
    }): Promise<IdentityResponse<{ accepted: true }>>;
  };
  google: {
    create(input: {
      headers: Headers;
      callback_url: string;
    }): Promise<IdentityResponse<{ redirect_url: string }>>;
  };
  session: {
    get(headers: Headers): Promise<IdentitySessionContext | null>;
    delete(headers: Headers): Promise<IdentityResponse<{ signed_out: true }>>;
  };
  provider: {
    handle(request: Request): Promise<Response>;
  };
};
