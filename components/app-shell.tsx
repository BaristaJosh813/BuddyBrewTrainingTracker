"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import buddyBrewLogo from "@/Copy of WHITELOGO_2019_BUDDYBREWCOFFEE (1).png";
import type { AppRole } from "@/lib/types";

function buildRoutes(role: AppRole | null, isAuthenticated: boolean): { href: Route; label: string }[] {
  if (!isAuthenticated) {
    return [{ href: "/login", label: "Login" }];
  }

  if (role === "company_admin") {
    return [
      { href: "/", label: "Training Dashboard" },
      { href: "/store", label: "Cafes" },
      { href: "/admin", label: "Admin Tasks" }
    ];
  }

  return [
    { href: "/", label: "Training Dashboard" },
    { href: "/store", label: "My Cafes" }
  ];
}

export function AppShell({
  children,
  userName,
  userEmail,
  userRole,
  isAuthenticated
}: {
  children: ReactNode;
  userName: string | null;
  userEmail: string | null;
  userRole: AppRole | null;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";
  const routes = buildRoutes(userRole, isAuthenticated);
  const identityLabel = userName || userEmail || "Signed in user";
  const roleLabel = userRole === "company_admin" ? "Company Admin" : userRole === "store_manager" ? "Store Manager" : null;

  if (isLoginRoute) {
    return <main className="login-shell">{children}</main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">
            <Image className="sidebar-logo" src={buddyBrewLogo} alt="Buddy Brew Coffee" priority />
          </div>
          <div className="eyebrow">Buddy Brew Coffee</div>
          <h1>Training Tracker</h1>
        </div>

        <nav className="sidebar-nav">
          {routes.map((route) => (
            <Link
              key={route.href}
              className={`nav-link${pathname === route.href ? " active" : ""}`}
              href={route.href}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        {isAuthenticated ? (
          <div className="sidebar-note">
            <strong>{identityLabel}</strong>
            {roleLabel ? <div style={{ marginTop: 6 }}>{roleLabel}</div> : null}
            <form action={signOutAction} style={{ marginTop: 16 }}>
              <button className="button secondary compact" type="submit">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="sidebar-note">
            Built for Buddy Brew leaders to monitor cafe onboarding, schedule barista development milestones, and keep
            every team member moving toward confident floor readiness.
          </div>
        )}
      </aside>

      <main className="content">
        {children}
        <nav className="route-tabs">
          {routes.map((route) => (
            <Link
              key={route.href}
              className={`nav-link${pathname === route.href ? " active" : ""}`}
              href={route.href}
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
