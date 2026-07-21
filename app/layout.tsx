import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
