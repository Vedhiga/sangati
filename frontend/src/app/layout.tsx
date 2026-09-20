import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { CustomCursor } from "@/components/ui/custom-cursor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-[#0A0A0A] font-sans text-[#F5F5F3] antialiased selection:bg-white/20 selection:text-white relative">
        {/* Architectural Background Grid Overlay */}
        <div className="fixed inset-0 bg-sangati-grid opacity-50 pointer-events-none z-0" />
        <CustomCursor />
        <div className="relative z-10 flex min-h-screen flex-col">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
