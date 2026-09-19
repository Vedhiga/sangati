import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Sangati — Where interests meet people",
  description:
    "Sangati is a community platform built around shared curiosities, activities, and authentic conversations without vanity metrics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased selection:bg-purple-500/20">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
