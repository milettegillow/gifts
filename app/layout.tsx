import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
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
      <html lang="en-GB" className={`${playfair.variable} h-full antialiased`}>
        <body className="flex min-h-full flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
