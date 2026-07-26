import { Coins } from "lucide-react";

export const metadata = {
  title: "tokenomics — memix",
  description: "MEMIX does not have a token.",
};

export default function TokenomicsPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="gradient-brand mb-6 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-soft-lg">
        <Coins size={20} strokeWidth={1.75} />
      </span>
      <h1 className="mb-4 font-heading text-2xl font-bold text-text sm:text-3xl">
        No token yet.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-dim">
        MEMIX does not have a token. This page will carry the
        distribution, utility, and supply details if and when one is
        introduced.
      </p>
      <p className="mt-5 max-w-md text-xs leading-relaxed text-dim/80">
        The catalogue and API do not require a token to use. Nothing here
        changes how the library works today.
      </p>
    </main>
  );
}
