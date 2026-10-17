import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gifts",
  description: "A private gift planner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      afterSignOutUrl="/login"
    >
      <html lang="en-GB" className={`${playfair.variable} h-full antialiased`}>
        <body className="flex min-h-full flex-col">
          <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-12">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
