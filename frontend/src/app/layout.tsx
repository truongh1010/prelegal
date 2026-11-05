import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { AuthGate } from "@/components/AuthGate";
import { LegalNotice } from "@/components/LegalNotice";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Prelegal",
  description: "Draft legal agreements from standard templates by chatting with AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas">
        <AuthGate>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </AuthGate>
        <footer className="border-t border-line px-6 py-4">
          <LegalNotice className="mx-auto w-full max-w-6xl text-xs text-muted" />
        </footer>
      </body>
    </html>
  );
}
