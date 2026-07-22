import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Hena Kless · Solutions Engineering for Applied AI";
  const description =
    "Enterprise solutions engineering that turns ambiguous AI requirements into credible tests, grounded decisions, and clear next steps.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: origin,
      title,
      description,
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Hena Kless — I make complex AI decisions easier to trust." }],
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
