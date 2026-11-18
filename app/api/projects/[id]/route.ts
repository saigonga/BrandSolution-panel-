import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, requireUser } from "@/lib/session";
import { projectInclude, toProjectDTO, toUpdateDTO } from "@/lib/stats";
import { isLocked } from "@/lib/time";

// Everyone on the team can read any project and its history.
// Only the owner or the manager can post to it.
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const p = await prisma.project.findUnique({
    where: { id: (await ctx.params).id },
    include: {
      ...projectInclude,
      updates: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!p) throw new HttpError(404, "That project no longer exists.");

  return NextResponse.json({
    project: toProjectDTO(p),
    updates: p.updates.map(toUpdateDTO),
    canEdit: p.ownerId === me.id || me.role === "MANAGER",
    locked: isLocked(),
  });
});
