import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lakehouse Playground for IOMETE",
  description:
    "Try IOMETE's sovereign data lakehouse with sample data from your industry, ask questions in plain words, and breeze through security review. No sign-up.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
          Independent hackCBS 9.0 project for the IOMETE track. Not an official IOMETE site. Facts link to IOMETE&apos;s public pages.
        </footer>
      </body>
    </html>
  );
}
