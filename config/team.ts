// ---------------------------------------------------------------------------
// TEAM ROSTER + ACCESS CONTROL
//
// Only the Google accounts listed here can sign in. Everyone else is rejected.
// Replace the placeholder emails with each person's real Google account
// (Gmail or Google Workspace).
//
//   role: "MANAGER"  -> everything: all money, manager dashboard, assigning
//                       projects, approving backfill requests
//   role: "EMPLOYEE" -> own workspace + own money, team board, client directory
//
// To add a new joiner: add a line here, then run  npm run db:seed
// ---------------------------------------------------------------------------

// Relative on purpose: prisma/seed.ts loads this file with ts-node, which
// does not understand the "@/" alias.
import { TEAMS, teamDef, type TeamId } from "./teams";

export type Role = "MANAGER" | "EMPLOYEE";

export interface TeamMember {
  email: string;
  name: string;
  title: string;
  role: Role;
  teams: TeamId[]; // managers can still open every team
}

export const TEAM: TeamMember[] = [
  {
    email: "pratik@theboredmonkey.com",
    name: "Pratik Sadavarti",
    title: "CEO & Head of Brand Solutions",
    role: "MANAGER",
    teams: ["BRAND_SOLUTIONS", "AI"],
  },
  {
    email: "sai.gonga@theboredmonkey.com",
    name: "Sai Gonga",
    title: "Owner",
    role: "MANAGER",
    teams: ["BRAND_SOLUTIONS", "AI"],
  },
  {
    email: "divya.yadavar@theboredmonkey.com",
    name: "Divya Yadavar",
    title: "Sr. Brand Solutions Manager",
    role: "EMPLOYEE",
    teams: ["BRAND_SOLUTIONS"],
  },
  {
    email: "abhishek.bhat@theboredmonkey.com",
    name: "Abhishek Bhat",
    title: "Sr. Brand Solutions Executive",
    role: "EMPLOYEE",
    teams: ["BRAND_SOLUTIONS"],
  },
  {
    email: "adarsh.jadhav@theboredmonkey.com",
    name: "Adarsh Jadhav",
    title: "Brand Solutions Executive",
    role: "EMPLOYEE",
    teams: ["BRAND_SOLUTIONS"],
  },
  {
    email: "haji.karim@theboredmonkey.com",
    name: "Haji Karim",
    title: "AI Team",
    role: "EMPLOYEE",
    teams: ["AI"],
  },
  {
    email: "jiya.bhagat@theboredmonkey.com",
    name: "Jiya Bhagat",
    title: "AI Team",
    role: "EMPLOYEE",
    teams: ["AI"],
  },
  {
    email: "sarvesh.yadav@theboredmonkey.com",
    name: "Sarvesh Yadav",
    title: "AI Team",
    role: "EMPLOYEE",
    teams: ["AI"],
  },
];

export function findMember(email?: string | null): TeamMember | undefined {
  if (!email) return undefined;
  const e = email.trim().toLowerCase();
  return TEAM.find((m) => m.email.trim().toLowerCase() === e);
}

export function teamOrder(email: string): number {
  const i = TEAM.findIndex((m) => m.email.toLowerCase() === email.toLowerCase());
  return i === -1 ? 999 : i;
}

// Teams this person can open. Managers see every team.
export function teamsFor(m: TeamMember): TeamId[] {
  return m.role === "MANAGER" ? TEAMS.map((t) => t.id) : m.teams;
}

// True for people who log closures and see clients (Brand Solutions, and managers).
export function hasMoney(m: TeamMember): boolean {
  return teamsFor(m).some((t) => teamDef(t).money);
}
