import { CatalogHero, StatusBadge, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "roadmap — memix",
  description: "What's shipped, in progress, and planned for MEMIX.",
};

const ITEMS: {
  status: "shipped" | "in progress" | "planned";
  title: string;
  body: string;
}[] = [
  {
    status: "shipped",
    title: "The library",
    body: "Images, video, and sound — searchable and free to download for anyone, no login or wallet. This is the core, and it is live. More formats — clippers and GIFs — are on the way.",
  },
  {
    status: "in progress",
    title: "The Librarian",
    body: "A curator you can ask directly. Natural search over the catalogue, answered in the archive's own voice, returning entries with their verdicts attached rather than a wall of results.",
  },
  {
    status: "in progress",
    title: "API v1 for machines",
    body: "Programmatic access for agents and bots, gated by API key. Humans stay free; machines are billed per call.",
  },
  {
    status: "planned",
    title: "Agent skills",
    body: "The catalogue exposed as skills other AI agents can hire, reached through agent-to-agent rails instead of a raw API call.",
  },
  {
    status: "planned",
    title: "Token",
    body: "A token tied to the catalogue and its agent skills, introduced once there's something real for it to connect to. No supply, allocation, or timeline details are final yet; this section will be filled in when they are.",
  },
  {
    status: "planned",
    title: "Creator",
    body: "Creators with genuinely original work get their own public profile. Anyone can browse a directory of creators, open a profile, and see what they've made. Sales are settled in $MEMIX, with a stablecoin option alongside it so creators aren't fully exposed to token volatility.",
  },
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="the library is live"
        title="What is on the shelf, and what is being catalogued next."
        lede="MEMIX ships in order. Each stage is finished, tested, and committed before the next one starts. No dates are promised — only sequence."
      />

      <ol className="flex flex-col gap-8">
        {ITEMS.map((item) => (
          <li key={item.title}>
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <h2 className="font-heading text-lg font-bold text-text">{item.title}</h2>
              <StatusBadge status={item.status} />
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-dim">{item.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-dim">
        Sequence may shift as the library grows. Stages are listed in build
        order, not on a calendar.
      </p>

      <PageColophon tagline="Humans browse without charge. Machines are billed. Machines do not mind." />
    </main>
  );
}
