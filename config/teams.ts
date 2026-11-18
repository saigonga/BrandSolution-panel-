// Teams that use the panel. Add a team here, then list its id in `teams`
// on each member in config/team.ts.
//
//   money:  true  -> closures, ledger, margins, fill rate, clients, backfills
//           false -> projects and deadlines only, no numbers
//   simple: true  -> a project needs only a name and a deadline
//                    (no client, no "next step" rules); work is internal

export type TeamId = "BRAND_SOLUTIONS" | "AI";

export interface TeamDef {
  id: TeamId;
  label: string;
  money: boolean;
  simple: boolean;
}

export const TEAMS: TeamDef[] = [
  { id: "BRAND_SOLUTIONS", label: "Brand Solutions", money: true, simple: false },
  { id: "AI", label: "AI", money: false, simple: true },
];

export function teamDef(id?: string | null): TeamDef {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[0];
}
