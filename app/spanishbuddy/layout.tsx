import type { Metadata } from "next";
import "./spanishbuddy.css";

export const metadata: Metadata = {
  title: "Spanish Buddy · Tu curso, contigo",
  description: "Convierte tus apuntes de español en una práctica diaria personal y adaptativa.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "https://henakless.com/spanishbuddy",
    title: "Spanish Buddy · Tu curso, contigo",
    description: "Sube lo que has aprendido. Practica lo que necesitas.",
    images: [
      {
        url: "https://henakless.com/presales/og-spanishbuddy.png",
        width: 1662,
        height: 946,
        alt: "Spanish Buddy — Tu curso, contigo.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spanish Buddy · Tu curso, contigo",
    description: "Sube lo que has aprendido. Practica lo que necesitas.",
    images: ["https://henakless.com/presales/og-spanishbuddy.png"],
  },
};

export default function SpanishBuddyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
