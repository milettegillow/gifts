import type { Metadata } from "next";
import { Lora, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// Headings and the wordmark.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700"],
});

// Body text: 500, with 600 for names, titles and emphasis.
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  // Absolute URLs for the Open Graph image.
  metadataBase: new URL("https://giftbook.milettegillow.com"),
  title: { default: "Giftbook", template: "%s - Giftbook" },
  description: "A private gift planner.",
  // Private: keep every page out of search engines.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      afterSignOutUrl="/login"
    >
      <html lang="en-GB" className={`${playfair.variable} ${lora.variable} h-full antialiased`}>
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
