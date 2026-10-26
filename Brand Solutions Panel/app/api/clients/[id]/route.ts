import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { cleanCats, str } from "@/lib/validate";
import { parseCats } from "@/lib/dto";

// Team members can add product categories to a brand.
// Only the manager can rename a brand, change its category, or remove a product category.
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const client = await prisma.client.findUnique({ where: { id: (await ctx.params).id } });
  if (!client) throw new HttpError(404, "That client no longer exists.");

  const b = await readJson(req);
  const brand = str(b.brand, 80) ?? client.brand;
  const brandCategory = str(b.brandCategory, 80) ?? client.brandCategory;
  const cats = b.productCategories !== undefined ? cleanCats(b.productCategories) : parseCats(client.productCategories);
  if (cats.length === 0) throw new HttpError(400, "Keep at least one product category.");

  const before = parseCats(client.productCategories);
  if (me.role !== "MANAGER") {
    if (brand !== client.brand || brandCategory !== client.brandCategory) {
      throw new HttpError(403, "Only the manager can rename a brand or change its category.");
    }
    const lower = cats.map((c) => c.toLowerCase());
    const removed = before.filter((c) => !lower.includes(c.toLowerCase()));
    if (removed.length) {
      throw new HttpError(403, `Only the manager can remove product categories (${removed.join(", ")}).`);
    }
  }

  if (brand.toLowerCase() !== client.brand.toLowerCase()) {
    const all = await prisma.client.findMany({ select: { brand: true } });
    if (all.some((c) => c.brand.toLowerCase() === brand.toLowerCase())) {
      throw new HttpError(409, `${brand} is already in the directory.`);
    }
  }

  await prisma.client.update({
    where: { id: client.id },
    data: { brand, brandCategory, productCategories: JSON.stringify(cats) },
  });
  return NextResponse.json({ ok: true });
});
