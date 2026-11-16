import { cookies } from "next/headers";
import { DEFAULT_TEAM, isTeamId, teamDef, type TeamDef, type TeamId } from "@/config/teams";
import type { CurrentUser } from "@/lib/session";

import { TEAM_COOKIE } from "@/lib/team-cookie";

// The team the person is looking at right now. Falls back to the first team
// they belong to if the cookie is missing or points at a team they can't open.
export async function getActiveTeam(me: CurrentUser): Promise<TeamDef> {
  const raw = (await cookies()).get(TEAM_COOKIE)?.value;
  const id: TeamId = isTeamId(raw) && me.teams.includes(raw) ? raw : me.teams[0] ?? DEFAULT_TEAM;
  return teamDef(id);
}
