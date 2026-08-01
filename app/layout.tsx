import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LibrarianWidget } from "@/components/librarian/LibrarianWidget";
import { LibrarianOpenProvider } from "@/components/librarian/LibrarianOpenContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

// Resolves relative Open Graph/Twitter image paths and powers the
// canonical URL Next.js writes into <head> — needs a stable production
// domain, which memixmeme.xyz now is.
export const metadata: Metadata = {
  metadataBase: new URL("https://memixmeme.xyz"),
  title: "memix",
  description: "the librarian for the internet's meme library.",
  // Domain-ownership verification for Virtuals Protocol — do not remove.
  other: {
    "virtual-protocol-site-verification": "86f1e3622501cdfd5196cfe251f6395f",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {/* Decorative background layer — fixed behind everything, never
            affects document flow/layout. Static aurora blob mesh (v6
            dark theme) + a thin grain overlay on top; see globals.css
            for why none of this is animated. */}
        <div aria-hidden className="bg-decoration">
          <div className="bg-blob bg-blob-cyan" />
          <div className="bg-blob bg-blob-violet" />
          <div className="bg-blob bg-blob-mint" />
          <div className="bg-blob bg-blob-pink" />
          <div className="bg-blob bg-blob-blue" />
          <div className="bg-dots" />
        </div>

        <LibrarianOpenProvider>
          <div className="page-enter relative flex min-h-screen flex-col">
            <Navbar />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </div>
          <LibrarianWidget />
        </LibrarianOpenProvider>
      </body>
    </html>
  );
}
