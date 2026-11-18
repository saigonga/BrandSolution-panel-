import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/report";
import { parseCats } from "@/lib/dto";
import AppShell from "@/components/AppShell";
import WorkspacePage from "@/app/(app)/workspace/page";
import TeamPage from "@/app/(app)/team/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import ClientsPage from "@/app/(app)/clients/page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await getUser();
  if (!me) redirect("/signin");

  const [clientRows, team] = await Promise.all([
    me.money ? prisma.client.findMany({ orderBy: { brand: "asc" } }) : Promise.resolve([]),
    getTeam(),
  ]);

  const clients = clientRows.map((c) => ({
    id: c.id,
    brand: c.brand,
    brandCategory: c.brandCategory,
    productCategories: parseCats(c.productCategories),
  }));

  const [workspaceView, teamView, dashboardView, clientsView] = await Promise.all([
    WorkspacePage(),
    TeamPage(),
    me.role === "MANAGER" ? DashboardPage() : Promise.resolve(null),
    me.money ? ClientsPage() : Promise.resolve(null),
  ]);

  return (
    <AppShell
      me={{ id: me.id, email: me.email, name: me.name, title: me.title, role: me.role, image: me.image, money: me.money, joinedKey: me.joinedKey }}
      clients={clients}
      team={team}
      views={{
        workspace: workspaceView,
        team: teamView,
        dashboard: dashboardView,
        clients: clientsView,
      }}
    />
  );
}
