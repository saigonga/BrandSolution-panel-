export const STAGES = [
  "Not started",
  "In progress",
  "Sent for review",
  "Awaiting client",
  "Closed",
  "Parked",
  "Dropped",
] as const;

export type Stage = (typeof STAGES)[number];

// Stages that require a "next step"
export const ACTIVE_STAGES = ["In progress", "Sent for review", "Awaiting client"];

export const PROJECT_TYPES = [
  "Client pitch",
  "Influencer campaign",
  "Production work",
  "IP creation",
  "Category check",
  "Internal research",
];

export function stageClass(stage: string): string {
  switch (stage) {
    case "Not started": return "p-notstarted";
    case "In progress": return "p-progress";
    case "Sent for review": return "p-review";
    case "Awaiting client": return "p-awaiting";
    case "Closed": return "p-closed";
    case "Parked": return "p-parked";
    case "Dropped": return "p-dropped";
    default: return "p-notstarted";
  }
}

const STAGE_ORDER: Record<string, number> = {
  "In progress": 0,
  "Sent for review": 1,
  "Awaiting client": 2,
  "Not started": 3,
  "Parked": 4,
  "Closed": 5,
  "Dropped": 6,
};

// Active work first, then waiting, then finished; most recently touched first within each.
export function sortProjects<T extends { stage: string; updatedAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const s = (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9);
    if (s !== 0) return s;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function isOpenStage(stage: string): boolean {
  return stage !== "Closed" && stage !== "Dropped" && stage !== "Parked";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
