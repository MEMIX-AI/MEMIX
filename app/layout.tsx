import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LibrarianWidget } from "@/components/librarian/LibrarianWidget";

export const metadata: Metadata = {
  title: "memevault",
  description: "the librarian for the internet's meme library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Web3Provider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col">{children}</div>
            <Footer />
          </div>
          <LibrarianWidget />
        </Web3Provider>
      </body>
    </html>
  );
}
