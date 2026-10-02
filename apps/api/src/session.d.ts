import 'express-session';
declare module 'express-session' {
  interface SessionData {
    userId?: string; version?: number; selectedRole?: string; mfaVerified?: boolean; issuedAt?: number;
    setupSecret?: string; setupExpires?: number;
  }
}
