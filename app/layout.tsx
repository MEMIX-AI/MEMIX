import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LibrarianWidget } from "@/components/librarian/LibrarianWidget";

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
            affects document flow/layout. Aurora gradient wash + large
            slow-drifting blurred color blobs + a faint sparkle layer +
            a very-low-opacity dot grid, per the redesign brief —
            deliberately not plain white. */}
        <div aria-hidden className="bg-decoration">
          <div className="bg-blob bg-blob-teal" />
          <div className="bg-blob bg-blob-sky" />
          <div className="bg-blob bg-blob-lavender" />
          <div className="bg-sparkle" />
          <div className="bg-dots" />
        </div>

        <div className="page-enter relative flex min-h-screen flex-col">
          <Navbar />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </div>
        <LibrarianWidget configured={!!process.env.ANTHROPIC_API_KEY} />
      </body>
    </html>
  );
}
