import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proof of Run",
  description: "Yeah nah prove it. Bridge to Brisbane training leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b">
          <div className="mx-auto max-w-2xl px-4 py-4 flex items-baseline justify-between">
            <Link href="/" className="leading-tight">
              <div className="text-xl font-semibold">Proof of Run</div>
              <div className="text-xs text-muted-foreground">yeah nah prove it</div>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Feed</Link>
              <Link href="/leaderboard" className="hover:underline">Leaderboard</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
