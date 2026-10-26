import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { checkStage, checkStageRules, dateKeyField, str } from "@/lib/validate";
import { dayKey, fmtShort, isLocked } from "@/lib/time";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  if (isLocked()) throw new HttpError(423, "Today is locked after 11:30 PM. It reopens at midnight.");

  const p = await prisma.project.findUnique({ where: { id: (await ctx.params).id } });
  if (!p) throw new HttpError(404, "That project no longer exists.");
  if (p.ownerId !== me.id && me.role !== "MANAGER") {
    throw new HttpError(403, "Only the owner or the manager can update this project.");
  }

  const b = await readJson(req);
  const note = str(b.note, 2000);
  const stage = b.stage !== undefined ? checkStage(b.stage) : p.stage;
  const nextStep = b.nextStep !== undefined ? str(b.nextStep, 300) : p.nextStep;
  const deadline = b.deadline !== undefined ? dateKeyField(b.deadline, "Deadline", true) : p.deadline;
  const reviewTo = stage === "Sent for review" && b.reviewTo !== undefined ? str(b.reviewTo, 80) : p.reviewTo;
  const reviewOn = stage === "Sent for review" && b.reviewOn !== undefined ? dateKeyField(b.reviewOn, "Review date", false) : p.reviewOn;
  const parkedReason = stage === "Parked" && b.parkedReason !== undefined ? str(b.parkedReason, 200) : p.parkedReason;

  checkStageRules({ stage, nextStep, reviewTo, reviewOn, parkedReason });

  const stageChanged = stage !== p.stage;
  const nextChanged = (nextStep ?? "") !== (p.nextStep ?? "");
  const deadlineChanged = (deadline ? dayKey(deadline) : "") !== (p.deadline ? dayKey(p.deadline) : "");
  const reviewChanged =
    stage === "Sent for review" &&
    ((reviewTo ?? "") !== (p.reviewTo ?? "") || (reviewOn ? dayKey(reviewOn) : "") !== (p.reviewOn ? dayKey(p.reviewOn) : ""));
  const parkedChanged = stage === "Parked" && (parkedReason ?? "") !== (p.parkedReason ?? "");

  if (!note && !stageChanged && !nextChanged && !deadlineChanged && !reviewChanged && !parkedChanged) {
    throw new HttpError(400, "Nothing to post. Add a note or change the stage, next step or deadline.");
  }

  // Build the log entries for this post.
  const entries: { type: string; body: string | null; fromStage?: string; toStage?: string }[] = [];
  if (stageChanged) {
    let why = note;
    if (!why && stage === "Parked") why = parkedReason;
    if (!why && stage === "Sent for review" && reviewTo) why = `Sent to ${reviewTo}${reviewOn ? ` on ${fmtShort(reviewOn)}` : ""}.`;
    entries.push({ type: "STAGE", body: why ?? null, fromStage: p.stage, toStage: stage });
  } else if (note) {
    entries.push({ type: "NOTE", body: note });
  }
  const edits: string[] = [];
  if (nextChanged) edits.push(nextStep ? `Next step: ${nextStep}` : "Next step cleared");
  if (deadlineChanged) edits.push(deadline ? `Deadline moved to ${fmtShort(deadline)}` : "Deadline cleared");
  if (reviewChanged && !stageChanged && reviewTo) edits.push(`Review: sent to ${reviewTo}${reviewOn ? ` on ${fmtShort(reviewOn)}` : ""}`);
  if (parkedChanged && !stageChanged && parkedReason) edits.push(`Parked reason: ${parkedReason}`);
  if (edits.length) entries.push({ type: "EDIT", body: edits.join(" · ") });

  await prisma.$transaction([
    prisma.project.update({
      where: { id: p.id },
      data: { stage, nextStep, deadline, reviewTo, reviewOn, parkedReason },
    }),
    ...entries.map((e, i) =>
      prisma.projectUpdate.create({
        data: {
          projectId: p.id,
          authorId: me.id,
          type: e.type,
          body: e.body,
          fromStage: e.fromStage ?? null,
          toStage: e.toStage ?? null,
          // keep the order of entries within one post stable in the log
          createdAt: new Date(Date.now() + i),
        },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
});
