import type { Metadata } from "next";
import "./spanishbuddy.css";

export const metadata: Metadata = {
  title: "Spanish Buddy · Your course, remembered",
  description: "Turn your Spanish course notes into personal, adaptive daily practice.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    url: "https://henakless.com/spanishbuddy",
    title: "Spanish Buddy · Your course, remembered",
    description: "Upload what you learned. Practice what you need.",
    images: [
      {
        url: "https://henakless.com/presales/og-spanishbuddy.png",
        width: 1662,
        height: 946,
        alt: "Spanish Buddy — Your course, remembered.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spanish Buddy · Your course, remembered",
    description: "Upload what you learned. Practice what you need.",
    images: ["https://henakless.com/presales/og-spanishbuddy.png"],
  },
};

export default function SpanishBuddyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
