import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Hena Kless · Enterprise Solutions Engineering";
  const description =
    "An applied Solutions Engineering proof of work: enterprise discovery, business value, architecture, Proof-of-Value design, and trust.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: origin,
      title,
      description,
      images: [{ url: `${origin}/og.png`, width: 1736, height: 911, alt: "Hena Kless — From complex requirements to credible decisions." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
