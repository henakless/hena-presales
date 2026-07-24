import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_BASE_PATH } from "../lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const pageUrl = `${origin}${SITE_BASE_PATH}`;
  const title = "Meet Hena · I built this experience just for you";
  const description =
    "An interactive introduction to Hena Kless and a mock enterprise discovery briefing experience.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: pageUrl,
      title,
      description,
      images: [{ url: `${pageUrl}/og.png`, width: 1730, height: 909, alt: "I built this experience just for you. Discovery starts before the meeting." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${pageUrl}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
