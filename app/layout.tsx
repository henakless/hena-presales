import type { Metadata } from "next";
import { SITE_BASE_PATH } from "../lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const pageUrl = `https://henakless.com${SITE_BASE_PATH}`;
  const title = "Meet Hena · I built this experience just for you";
  const description =
    "An interactive introduction to Hena Kless and a mock enterprise discovery briefing experience.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
      },
    },
    icons: {
      icon: [
        { url: `${SITE_BASE_PATH}/favicon.svg?v=4`, type: "image/svg+xml" },
        { url: `${SITE_BASE_PATH}/favicon-convergence.ico`, sizes: "any" },
        { url: `${SITE_BASE_PATH}/favicon-convergence.png`, type: "image/png", sizes: "512x512" },
      ],
      shortcut: `${SITE_BASE_PATH}/favicon.svg?v=4`,
      apple: [
        {
          url: `${SITE_BASE_PATH}/apple-touch-icon-convergence.png`,
          type: "image/png",
          sizes: "180x180",
        },
      ],
    },
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
