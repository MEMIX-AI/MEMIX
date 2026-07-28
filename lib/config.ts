// Centralized external/social links. Footer.tsx renders each icon only
// when its value is non-null — no component change needed when one of
// these goes from null to a real URL, or back.
export const SOCIAL_LINKS: { github: string | null; x: string | null } = {
  github: "https://github.com/MEMIX-AI/MEMIX",
  x: "https://x.com/Memixzwg",
};
