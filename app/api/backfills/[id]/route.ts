import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireManager } from "@/lib/session";

// Manager approves or denies a backfill request.
// An approval opens that day for the requester until tonight's lock.
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireManager();
  const b = await readJson(req);
  const action = b.action;
  if (action !== "approve" && action !== "deny") throw new HttpError(400, "Choose approve or deny.");

  const r = await prisma.backfillRequest.findUnique({ where: { id: (await ctx.params).id } });
  if (!r) throw new HttpError(404, "That request no longer exists.");
  if (r.status !== "PENDING") throw new HttpError(409, "This request was already decided.");

  await prisma.backfillRequest.update({
    where: { id: r.id },
    data: { status: action === "approve" ? "APPROVED" : "DENIED", decidedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});
