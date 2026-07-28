"use client";

import { createContext, useContext, useState } from "react";

// Lets the Navbar's "agent" nav item and the floating chat bubble both
// open the exact same Librarian panel, instead of each having its own
// disconnected open/close state.
interface LibrarianOpenValue {
  open: boolean;
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const LibrarianOpenContext = createContext<LibrarianOpenValue | null>(null);

export function LibrarianOpenProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <LibrarianOpenContext.Provider value={{ open, setOpen }}>
      {children}
    </LibrarianOpenContext.Provider>
  );
}

export function useLibrarianOpen(): LibrarianOpenValue {
  const ctx = useContext(LibrarianOpenContext);
  if (!ctx) {
    throw new Error("useLibrarianOpen must be used within LibrarianOpenProvider");
  }
  return ctx;
}
