import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://nexdesk.com"),
  title: {
    default: "Nex Desk — software agency",
    template: "%s · Nex Desk",
  },
  description:
    "We build websites, apps and growth systems that ship. Web development, design, SEO, paid ads and AI automation.",
  openGraph: {
    type: "website",
    siteName: "Nex Desk",
    title: "Nex Desk — software agency",
    description: "Websites, apps and growth systems that ship.",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-ink-800)",
              border: "0.5px solid var(--color-ink-600)",
              color: "var(--color-bone-50)",
            },
          }}
        />
      </body>
    </html>
  );
}
