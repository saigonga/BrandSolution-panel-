import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, HttpError, readJson, requireUser } from "@/lib/session";
import { cleanCats, str } from "@/lib/validate";
import { parseCats } from "@/lib/dto";

export const GET = handle(async () => {
  await requireUser();
  const rows = await prisma.client.findMany({ orderBy: { brand: "asc" } });
  return NextResponse.json({
    clients: rows.map((c) => ({
      id: c.id,
      brand: c.brand,
      brandCategory: c.brandCategory,
      productCategories: parseCats(c.productCategories),
    })),
  });
});

// Anyone on the team can add a brand they're working with or pitching.
export const POST = handle(async (req: Request) => {
  await requireUser();
  const b = await readJson(req);

  const brand = str(b.brand, 80);
  const brandCategory = str(b.brandCategory, 80);
  const cats = cleanCats(b.productCategories);
  if (!brand) throw new HttpError(400, "Add the brand name.");
  if (!brandCategory) throw new HttpError(400, "Add the brand category.");
  if (cats.length === 0) throw new HttpError(400, "Add at least one product category.");

  const all = await prisma.client.findMany({ select: { brand: true } });
  if (all.some((c) => c.brand.toLowerCase() === brand.toLowerCase())) {
    throw new HttpError(409, `${brand} is already in the directory. Edit it to add product categories.`);
  }

  const c = await prisma.client.create({
    data: { brand, brandCategory, productCategories: JSON.stringify(cats) },
  });
  return NextResponse.json({ id: c.id }, { status: 201 });
});
