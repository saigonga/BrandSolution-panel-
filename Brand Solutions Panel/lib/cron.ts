import { getUser } from "@/lib/session";

// Scheduled jobs authenticate with CRON_SECRET (Vercel Cron sends it as a
// Bearer token automatically). A signed-in manager can also open the job URL
// with ?preview=1 to see the email in the browser without sending it.
export async function cronAccess(req: Request): Promise<"run" | "preview" | null> {
  const url = new URL(req.url);
  if (url.searchParams.get("preview") === "1") {
    const u = await getUser();
    return u?.role === "MANAGER" ? "preview" : null;
  }
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return "run";
  return null;
}
