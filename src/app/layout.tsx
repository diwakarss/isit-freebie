import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Is it a Freebie?",
  description: "Type any government scheme. We'll tell you if it's welfare or a vote grab.",
  openGraph: {
    title: "Is it a Freebie?",
    description: "Type any government scheme. We'll tell you if it's welfare or a vote grab.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg antialiased">{children}</body>
    </html>
  );
}
