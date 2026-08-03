import type { Metadata } from "next";
import "./spanishbuddy.css";

export const metadata: Metadata = {
  title: "Spanish Buddy · Dein Kurs, im Kopf",
  description: "Verwandle deine Spanisch-Kursnotizen in ein persönliches, adaptives tägliches Training.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "https://henakless.com/spanishbuddy",
    title: "Spanish Buddy · Dein Kurs, im Kopf",
    description: "Lade hoch, was du gelernt hast. Übe, was du brauchst.",
    images: [
      {
        url: "https://henakless.com/presales/og-spanishbuddy.png",
        width: 1662,
        height: 946,
        alt: "Spanish Buddy — Dein Kurs, im Kopf.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spanish Buddy · Dein Kurs, im Kopf",
    description: "Lade hoch, was du gelernt hast. Übe, was du brauchst.",
    images: ["https://henakless.com/presales/og-spanishbuddy.png"],
  },
};

export default function SpanishBuddyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
