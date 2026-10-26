import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { checkProjectType, checkStage, checkStageRules, dateKeyField, str } from "@/lib/validate";
import { dayKey, dayStart, isLocked } from "@/lib/time";
import { parseCats } from "@/lib/dto";
import { projectInclude, toProjectDTO } from "@/lib/stats";
import { findMember } from "@/config/team";

export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (isLocked()) throw new HttpError(423, "Today is locked after 11:30 PM. It reopens at midnight.");
  const b = await readJson(req);

  const name = str(b.name, 140);
  if (!name) throw new HttpError(400, "Give the project a name.");

  const workType = b.workType === "INTERNAL" ? "INTERNAL" : "CLIENT";
  const projectType = checkProjectType(b.projectType);
  const stage = checkStage(b.stage ?? "Not started");
  const nextStep = str(b.nextStep, 300);
  const deadline = dateKeyField(b.deadline, "Deadline", true)!;
  const today = dayKey();
  if (dayKey(deadline) < today) throw new HttpError(400, "The deadline can't be in the past.");

  const reviewTo = stage === "Sent for review" ? str(b.reviewTo, 80) : null;
  const reviewOn = stage === "Sent for review" ? dateKeyField(b.reviewOn, "Review date", false) : null;
  const parkedReason = stage === "Parked" ? str(b.parkedReason, 200) : null;

  let clientId: string | null = null;
  let productCategory: string | null = null;
  let internalCategory: string | null = null;

  if (workType === "CLIENT") {
    const client = await prisma.client.findUnique({ where: { id: String(b.clientId ?? "") } });
    if (!client) throw new HttpError(400, "Pick a client from the directory.");
    clientId = client.id;
    const pc = str(b.productCategory, 80);
    if (pc) {
      if (!parseCats(client.productCategories).includes(pc)) {
        throw new HttpError(400, `${pc} isn't a product category for ${client.brand}. Add it in the client directory first.`);
      }
      productCategory = pc;
    }
  } else {
    internalCategory = str(b.internalCategory, 120);
    if (!internalCategory) throw new HttpError(400, "Add the category or label for this internal work.");
  }

  let ownerId = me.id;
  let ownerName = me.name;
  if (b.ownerId && b.ownerId !== me.id) {
    if (me.role !== "MANAGER") throw new HttpError(403, "Only the manager can assign projects to someone else.");
    const owner = await prisma.user.findUnique({ where: { id: String(b.ownerId) } });
    if (!owner || !findMember(owner.email)) throw new HttpError(400, "Pick someone from the team.");
    ownerId = owner.id;
    ownerName = owner.name;
  }

  checkStageRules({ stage, nextStep, reviewTo, reviewOn, parkedReason });

  const created = await prisma.project.create({
    data: {
      name,
      workType,
      projectType,
      stage,
      nextStep,
      startDate: dayStart(today),
      deadline,
      reviewTo,
      reviewOn,
      parkedReason,
      internalCategory,
      productCategory,
      clientId,
      ownerId,
      updates: {
        create: {
          type: "CREATE",
          authorId: me.id,
          toStage: stage,
          body: ownerId !== me.id ? `Assigned to ${ownerName} by ${me.name}.` : "Project created.",
        },
      },
    },
    include: projectInclude,
  });

  return NextResponse.json({ project: toProjectDTO(created) }, { status: 201 });
});
