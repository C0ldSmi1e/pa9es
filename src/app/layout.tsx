import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReferralCapture } from "@/src/components/referral-capture";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pa9es",
  description: "Host a single HTML page — live in thirty seconds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReferralCapture />
        {children}
      </body>
    </html>
  );
}
