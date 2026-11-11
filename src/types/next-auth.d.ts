import type { DefaultSession } from "next-auth";

/**
 * Augmentation des types NextAuth — expose `user.id` dans les sessions
 * (utile pour /account et tout futur composant authentifié).
 */
declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
