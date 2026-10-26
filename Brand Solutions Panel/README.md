# Brand Solutions Panel

Daily project and revenue tracker for the TBM Brand Solutions team.
Next.js 16 · NextAuth (Google) · Prisma · SQLite locally, Postgres when hosted.

## Run it locally

1. Install Node 20.9 or newer.
2. Fill `.env`:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` from Google Cloud Console → APIs & Services → Credentials → OAuth client (Web application).
     Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
   - `NEXTAUTH_SECRET`: run `openssl rand -base64 32` and paste the result.
3. Put the team's real Google emails in `config/team.ts` (Divya, Abhishek, Adarsh are placeholders).
4. Run:
   ```
   npm install
   npm run setup      # creates the database and loads the client directory
   npm run dev
   ```
5. Open http://localhost:3000 and sign in with Google.
   No Google keys yet? `DEV_LOGIN=true` in `.env` adds a test login to pick any team member. It only works with `npm run dev`, never in production.

## Access

`config/team.ts` is the access list. Only those Google accounts can sign in.
- MANAGER (Pratik): everything, including the manager dashboard, assigning projects, approving backfills, all money.
- EMPLOYEE: own workspace and own money, team board, client directory.

New joiner: add a line to `config/team.ts`, then `npm run db:seed`.

## Rules built in

- Day locks at 11:30 PM IST. After that, projects and ledger are read-only until midnight.
- Missed day: the person files a backfill request; once the manager approves, that day is open to them until that night's lock.
- 000: one tap logs "no closure today" so the day still counts as filled.
- Net margin = closed − direct expense. Gross margin = net + agency fee. Always calculated, never typed.
- Active projects need a next step. Sent for review needs who and when. Parked needs a reason.
- Stale = active and untouched for 5 working days. Closed and dropped projects archive at month end.
- Working days, lock time and stale threshold live in `config/settings.ts`.

## Emails (optional)

Daily summary at 6:00 AM IST (yesterday, to the manager) and weekly summary Saturday 9:00 AM IST (to the manager plus `LEADERSHIP_EMAILS`).
Fill the `SMTP_*` and `CRON_SECRET` values in `.env`. On Vercel, `vercel.json` schedules both. Elsewhere, call
`/api/cron/daily` and `/api/cron/weekly` with header `Authorization: Bearer <CRON_SECRET>`.
The manager can preview both from the dashboard without sending.

## Hosting

SQLite is for local use. For hosting, change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`,
set `DATABASE_URL` to a Postgres URL, set `NEXTAUTH_URL` to the live domain, add the live redirect URI in Google Console,
then `npm run setup`.
