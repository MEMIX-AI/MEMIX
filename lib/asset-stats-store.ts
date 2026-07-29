"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;

// Tiny generic "shared client cache keyed by id" — not React Query/Zustand.
// This project deliberately keeps wagmi/react-query scoped to just the
// wallet widget (see components/providers/Web3Provider.tsx) to avoid
// pulling that bundle into every page, so this is a from-scratch pub-sub
// instead of reusing that QueryClient. One entry per (metric, assetId);
// every AssetCard/detail-page instance rendering the SAME asset on the
// SAME page subscribes to the same entry, so a mutation from any one of
// them (like toggle, download click) notifies all of them instantly, with
// no page reload — see task: "Like/count nggak sinkron antar-section."
function createFieldStore<T>() {
  const values = new Map<string, T>();
  const listeners = new Map<string, Set<Listener>>();

  function subscribe(key: string, cb: Listener) {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) listeners.delete(key);
    };
  }

  function get(key: string): T | undefined {
    return values.get(key);
  }

  function set(key: string, value: T) {
    values.set(key, value);
    listeners.get(key)?.forEach((cb) => cb());
  }

  // getServerSnapshot (3rd arg) always returns `initial` untouched. This
  // module's Map is meant to be a browser-tab-scoped singleton, but Next
  // still executes "use client" code during SSR to produce the initial
  // HTML, and one Node process/lambda can serve multiple users' requests.
  // Reading/seeding the shared map from the server snapshot path would risk
  // leaking one user's optimistic update into another user's SSR output.
  function useValue(key: string, initial: T): T {
    return useSyncExternalStore(
      (cb) => subscribe(key, cb),
      () => {
        if (!values.has(key)) values.set(key, initial);
        return values.get(key)!;
      },
      () => initial,
    );
  }

  return { get, set, useValue };
}

export const likeStore = createFieldStore<{ liked: boolean; count: number }>();
export const viewCountStore = createFieldStore<number>();
export const downloadCountStore = createFieldStore<number>();

export function bumpDownloadCount(assetId: string) {
  const current = downloadCountStore.get(assetId);
  downloadCountStore.set(assetId, (current ?? 0) + 1);
}
