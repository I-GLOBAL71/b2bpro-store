import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Route d'authentification NextAuth (App Router).
 * Expose /api/auth/* : session, providers, signin (Google / lien magique email),
 * callback, signout.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
