export type Session = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  user: User;
};

export type User = {
  id: string;
  email?: string | null;
  role?: string;
  aud?: string;
  created_at?: string;
  updated_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export type AuthStateChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED';
