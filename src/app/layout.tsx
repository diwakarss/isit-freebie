import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://isitafreebie.jdlabs.top";

export const metadata: Metadata = {
  title: "Is it a Freebie?",
  description: "Type any government scheme. We'll tell you if it's welfare or a vote grab.",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Is it a Freebie?",
    description: "Type any government scheme. We score it on a freebie-welfare spectrum.",
    type: "website",
    url: SITE_URL,
    siteName: "Is it a Freebie?",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Is it a Freebie? — Type any government scheme. We score it.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Is it a Freebie?",
    description: "Type any government scheme. We score it on a freebie-welfare spectrum.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
      </head>
      <body className="min-h-screen bg-bg antialiased">{children}</body>
    </html>
  );
}
