import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bhakti-vriksha-site.vercel.app"),
  title: {
    default: "Bhakti Vriksha Radha Madan Mohan",
    template: "%s",
  },
  description:
    "A Sunday journey through the Bhagavad-gita for families, under the shelter of Sri Sri Radha Madan Mohan.",
  openGraph: {
    type: "website",
    siteName: "Bhakti Vriksha Radha Madan Mohan",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
