const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) dbUrl = match[1];
  }
}

if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
  console.log("Postgres DATABASE_URL detected — pushing schema and seeding database...");
  execSync("npx prisma db push", { stdio: "inherit" });
  execSync("npm run db:seed", { stdio: "inherit" });
} else {
  console.log("Skipping prisma db push during build (no postgresql:// DATABASE_URL configured yet).");
}
