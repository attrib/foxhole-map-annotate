import type session from "express-session";
import type { GrantSession, GrantResponse } from "grant";

import type { Access } from "./ACLS.js";
import type { Session, SessionData } from "express-session";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV:
        | "test"
        | "development"
        | "production"
        | (string & NonNullable<Object>) /** Wildcard */;
      PORT?: string;
      SESSION_SECRET: string;
      DISCORD_CLIENT_ID: string;
      DISCORD_CLIENT_SECRET: string;
      DISCORD_CALLBACK_URL: string;
    }
  }
}

declare module "express-session" {
  export interface SessionData {
    user: string;
    userId: string;
    discordId: string;
    acl: Access;
    lastLoginCheck: number;
    grant: GrantSession;
  }
}

declare module "grant" {
  export interface GrantResponse {
    access_token_end: number | undefined;
  }
}

declare module "http" {
  export interface IncomingMessage {
    session: Session & Partial<SessionData>;
  }
}