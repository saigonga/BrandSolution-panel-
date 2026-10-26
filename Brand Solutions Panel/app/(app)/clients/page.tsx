import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { parseCats } from "@/lib/dto";
import Topbar from "@/components/Topbar";
import ClientsView from "@/components/ClientsView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const me = await getUser();
  if (!me) redirect("/signin");

  const rows = await prisma.client.findMany({
    orderBy: { brand: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  const clients = rows.map((c) => ({
    id: c.id,
    brand: c.brand,
    brandCategory: c.brandCategory,
    productCategories: parseCats(c.productCategories),
    projectCount: c._count.projects,
  }));

  return (
    <>
      <Topbar title="Client Directory" sub="Every brand we work with or are pitching" />
      <section className="view">
        <div className="pad">
          <ClientsView clients={clients} isManager={me.role === "MANAGER"} />
        </div>
      </section>
    </>
  );
}
