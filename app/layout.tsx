import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getCurrentViewer } from "@/lib/rbac";

import "./globals.css";

export const metadata: Metadata = {
  title: "Buddy Brew Coffee Training Tracker",
  description: "Buddy Brew Coffee's internal tracker for cafe onboarding, barista milestones, and team readiness."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await getCurrentViewer();

  return (
    <html lang="en">
      <body>
        <AppShell
          userName={viewer?.profile?.fullName ?? null}
          userEmail={viewer?.email ?? null}
          userRole={viewer?.profile?.appRole ?? null}
          isAuthenticated={Boolean(viewer)}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
