import type session from "express-session";
import type { GrantResponse } from "grant";

import type { Access } from "./ACLS.js";

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
    grant: GrantResponse;
  }
}
