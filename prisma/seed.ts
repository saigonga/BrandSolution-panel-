import { PrismaClient } from "@prisma/client";
import { TEAM } from "../config/team";

const prisma = new PrismaClient();

// Real TBM client reference data (brand + brand category + product categories).
// This is reference data, not sample project/revenue data.
const CLIENTS: { brand: string; brandCategory: string; productCategories: string[] }[] = [
  { brand: "Atomberg", brandCategory: "Consumer appliances", productCategories: ["Fans", "Mixer grinders", "Water purifiers", "Kitchen appliances"] },
  { brand: "Bajaj Appliances", brandCategory: "Consumer appliances", productCategories: ["Fans", "Mixer grinders", "Kitchen appliances", "Lighting"] },
  { brand: "Scapia", brandCategory: "Fintech", productCategories: ["Travel credit card"] },
  { brand: "Nivaan Care", brandCategory: "Healthcare", productCategories: ["Non-surgical pain clinics"] },
  { brand: "Frostella", brandCategory: "FMCG", productCategories: ["Frozen desserts", "Ice cream"] },
  { brand: "SeeIt", brandCategory: "Consumer electronics", productCategories: ["AI glasses"] },
  { brand: "Eclipse Solaire", brandCategory: "Real estate", productCategories: ["Residential", "Commercial"] },
  { brand: "SaffronStays", brandCategory: "Hospitality", productCategories: ["Villas", "Homestays"] },
  { brand: "Asaya", brandCategory: "Skincare / D2C", productCategories: ["Face care", "Body care"] },
  { brand: "Hyphen", brandCategory: "Skincare / D2C", productCategories: ["Sunscreen", "Skincare"] },
];

async function main() {
  // Team members (so project ownership/FKs exist even before first login).
  for (const m of TEAM) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: { name: m.name, role: m.role },
      create: { email: m.email, name: m.name, role: m.role },
    });
  }

  // Client directory
  for (const c of CLIENTS) {
    await prisma.client.upsert({
      where: { brand: c.brand },
      update: { brandCategory: c.brandCategory, productCategories: JSON.stringify(c.productCategories) },
      create: {
        brand: c.brand,
        brandCategory: c.brandCategory,
        productCategories: JSON.stringify(c.productCategories),
      },
    });
  }

  console.log(`Seeded ${TEAM.length} users and ${CLIENTS.length} clients.`);
  console.log("No sample projects, closures, or activity were created — those start empty.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
