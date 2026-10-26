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

export type Role = "MANAGER" | "EMPLOYEE";

export interface TeamMember {
  email: string;
  name: string;
  title: string;
  role: Role;
}

export const TEAM: TeamMember[] = [
  {
    email: "pratik@theboredmonkey.com",
    name: "Pratik Sadavarti",
    title: "CEO & Head of Brand Solutions",
    role: "MANAGER",
  },
  {
    email: "saigonga34@gmail.com",
    name: "Owner",
    title: "Owner",
    role: "MANAGER",
  },
  {
    email: "divya.yadavar@theboredmonkey.com",
    name: "Divya Yadavar",
    title: "Sr. Brand Solutions Manager",
    role: "EMPLOYEE",
  },
  {
    email: "abhishek.bhat@theboredmonkey.com",
    name: "Abhishek Bhat",
    title: "Sr. Brand Solutions Executive",
    role: "EMPLOYEE",
  },
  {
    email: "adarsh.jadhav@theboredmonkey.com",
    name: "Adarsh Jadhav",
    title: "Brand Solutions Executive",
    role: "EMPLOYEE",
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
