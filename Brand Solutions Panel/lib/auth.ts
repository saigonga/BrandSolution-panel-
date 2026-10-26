import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { findMember } from "@/config/team";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    // Gate: only emails on the roster (config/team.ts) may sign in.
    async signIn({ profile, user }) {
      const email = (profile as { email?: string } | undefined)?.email ?? user?.email;
      return !!findMember(email);
    },

    async jwt({ token, profile, user }) {
      const email = (profile as { email?: string } | undefined)?.email ?? user?.email ?? token.email;
      const member = findMember(email);

      // Removed from the roster -> session is no longer valid.
      if (!member) {
        token.role = "NONE";
        return token;
      }

      // First sign-in: create or refresh the DB row with the Google photo.
      if (profile || user) {
        const picture = (profile as { picture?: string } | undefined)?.picture ?? user?.image ?? null;
        const row = await prisma.user.upsert({
          where: { email: member.email },
          update: { name: member.name, role: member.role, ...(picture ? { image: picture } : {}) },
          create: { email: member.email, name: member.name, role: member.role, image: picture },
        });
        token.uid = row.id;
        token.picture = row.image ?? token.picture;
      }

      // Role always comes from the roster, so edits apply on the next request.
      token.role = member.role;
      token.name = member.name;
      token.email = member.email;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
};
