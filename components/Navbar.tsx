"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectKitButton, useSIWE } from "connectkit";
import { useAccountRole } from "@/lib/hooks/useAccountRole";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { isSignedIn, signIn, signOut, isLoading } = useSIWE();
  const { isAdmin } = useAccountRole(isSignedIn ? address : undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="border-b border-line px-6 py-4 flex items-center justify-between relative">
      <Link href="/" className="text-accent font-bold">
        memevault<span className="cursor-blink">▊</span>
      </Link>
      <nav className="text-dim text-sm flex items-center gap-4">
        <Link href="/library" className="hover:text-accent">
          [library]
        </Link>
        <Link href="/upload" className="hover:text-accent">
          [upload]
        </Link>
        <span>[agent]</span>
        <span>[docs]</span>

        <ConnectKitButton.Custom>
          {({ show }) => {
            if (!isConnected) {
              return (
                <button
                  onClick={show}
                  className="border border-line rounded px-3 py-1 text-text hover:border-accent"
                >
                  $ connect
                </button>
              );
            }

            if (!isSignedIn) {
              return (
                <button
                  onClick={() => signIn()}
                  className="border border-line rounded px-3 py-1 text-text hover:border-accent"
                >
                  {isLoading ? "$ signing..." : "$ sign-in"}
                </button>
              );
            }

            const truncated = address
              ? `${address.slice(0, 6)}…${address.slice(-4)}`
              : "";

            return (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="border border-line rounded px-3 py-1 text-text hover:border-accent flex items-center gap-2"
                >
                  {truncated}
                  {isAdmin && (
                    <span className="text-accent text-xs border border-accent rounded px-1">
                      admin
                    </span>
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 border border-line bg-panel rounded w-40 text-sm z-10">
                    <Link
                      href="/my-uploads"
                      className="block px-3 py-2 hover:text-accent"
                      onClick={() => setMenuOpen(false)}
                    >
                      › my uploads
                    </Link>
                    <Link
                      href="/my-uploads/api-key"
                      className="block px-3 py-2 hover:text-accent"
                      onClick={() => setMenuOpen(false)}
                    >
                      › api key
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 hover:text-accent"
                        onClick={() => setMenuOpen(false)}
                      >
                        › admin panel
                      </Link>
                    )}
                    <button
                      className="block w-full text-left px-3 py-2 hover:text-accent"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                    >
                      › disconnect
                    </button>
                  </div>
                )}
              </div>
            );
          }}
        </ConnectKitButton.Custom>
      </nav>
    </header>
  );
}
