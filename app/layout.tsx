import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "UsineFlow — Industrial Operations OS",
  description:
    "Système d’exploitation des opérations industrielles pour usines, ateliers et entrepôts au Maroc.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "UsineFlow",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn("h-full bg-sidebar antialiased", "font-sans")}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <Script src="/polaris-2.0-rc.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
