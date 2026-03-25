import { hasSupabaseEnv, isLocalAdminBypassEnabled } from "@/lib/env";
import Image from "next/image";

import buddyBrewLogo from "@/Copy of WHITELOGO_2019_BUDDYBREWCOFFEE (1).png";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!hasSupabaseEnv() || isLocalAdminBypassEnabled()) {
    return (
      <div className="login-page">
        <div className="login-header">
          <div className="login-logo-wrap">
            <Image className="login-logo" src={buddyBrewLogo} alt="Buddy Brew Coffee" priority />
          </div>
          <div className="login-header-copy">
            <div className="login-kicker">Buddy Brew Coffee</div>
            <h1>Training Tracker</h1>
            <p>Manager access for cafe onboarding, barista development, and team readiness.</p>
          </div>
        </div>

        <section className="login-card">
          <div className="page-copy">
            <div className="eyebrow login-card-eyebrow">System status</div>
            <h2>Supabase auth is not active</h2>
            <p>This environment is using demo data or local admin bypass, so sign-in is currently disabled here.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo-wrap">
          <Image className="login-logo" src={buddyBrewLogo} alt="Buddy Brew Coffee" priority />
        </div>
        <div className="login-header-copy">
          <div className="login-kicker">Buddy Brew Coffee</div>
        </div>
      </div>

      <section className="login-card">
        <div className="page-copy">
          <div className="eyebrow login-card-eyebrow">Manager sign in</div>
          <h2>Access your training dashboard</h2>
        </div>

        {error ? <div className="login-alert">{error}</div> : null}

        <form action="/auth/login" className="login-form" method="post">
          <div className="input-grid login-input-grid">
            <label className="field full">
              <span>Email</span>
              <input autoComplete="email" name="email" type="email" placeholder="manager@buddybrew.com" required />
            </label>
            <label className="field full">
              <span>Password</span>
              <input autoComplete="current-password" name="password" type="password" placeholder="Enter your password" required />
            </label>
          </div>
          <div className="button-row login-button-row">
            <button className="button primary login-button" type="submit">
              Sign in
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
