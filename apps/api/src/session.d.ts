import 'express-session';
declare module 'express-session' {
  interface SessionData {
    userId?: string; version?: number; selectedRole?: string; mfaVerified?: boolean; issuedAt?: number;
    setupSecret?: string; setupExpires?: number;
    platformMfaAssured?: boolean; platformMfaAt?: number; lastActivityAt?: number;
    platformChallenge?: {
      id: string; userId: string; version: number; stage: 'password-change' | 'enrollment' | 'totp' | 'recovery-ack';
      expiresAt: number; attempts: number; encryptedSecret?: string;
    };
    platformReplacement?: {
      id: string; userId: string; version: number; stage: 'verify' | 'recovery-ack';
      issuedAt: number; expiresAt: number; attempts: number; encryptedSecret: string;
      verifiedStep?: number; recoveryHashes?: string[];
    };
  }
}
