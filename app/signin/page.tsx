import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import SignInButton from "@/components/SignInButton";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  AccessDenied: "This Google account isn't on the Brand Solutions team list. Ask Pratik to add you.",
  OAuthSignin: "Google sign-in couldn't start. Check the Google client ID and secret in .env.",
  OAuthCallback: "Google sign-in didn't complete. Try again.",
  Configuration: "Sign-in isn't configured yet. Fill the Google client ID, secret and NEXTAUTH_SECRET in .env.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await getUser();
  if (me) redirect("/");

  const { error } = await searchParams;
  const err = error ? ERRORS[error] ?? "Sign-in failed. Try again." : null;

  return (
    <div className="signin-wrap">
      <div className="signin">
        <div className="brand">
          <span className="mk" />
          <div>
            <b>TBM</b>
            <span>Brand Solutions</span>
          </div>
        </div>
        <div>
          <h1>Brand Solutions Panel</h1>
          <p style={{ marginTop: 6 }}>Your projects, your closures, one place. Sign in with your work Google account.</p>
        </div>
        {err && <div className="formerr">{err}</div>}
        <SignInButton />
        <div className="fine">Only team members on the access list can sign in.</div>
      </div>
    </div>
  );
}
