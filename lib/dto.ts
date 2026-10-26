// Plain shapes passed from server to client components.

export interface ClientDTO {
  id: string;
  brand: string;
  brandCategory: string;
  productCategories: string[];
  projectCount?: number;
}

export interface MemberDTO {
  id: string;
  name: string;
  title: string;
  role: "MANAGER" | "EMPLOYEE";
  image: string | null;
  joinedKey: string; // IST day they joined the panel; fill rate counts from here
}

export interface ProjectDTO {
  id: string;
  name: string;
  workType: "CLIENT" | "INTERNAL";
  projectType: string;
  stage: string;
  nextStep: string | null;
  startDate: string;
  deadline: string | null;
  reviewTo: string | null;
  reviewOn: string | null;
  parkedReason: string | null;
  internalCategory: string | null;
  productCategory: string | null;
  client: { id: string; brand: string } | null;
  owner: { id: string; name: string; image: string | null };
  updatedAt: string;
  staleDays: number;
  isStale: boolean;
  isOverdue: boolean;
}

export interface UpdateDTO {
  id: string;
  type: "NOTE" | "STAGE" | "CREATE" | "EDIT";
  body: string | null;
  fromStage: string | null;
  toStage: string | null;
  createdAt: string;
  author: { id: string; name: string };
}

export interface ClosureDTO {
  id: string;
  dayKey: string;
  isZero: boolean;
  description: string | null;
  productCategory: string | null;
  client: { id: string; brand: string } | null;
  owner: { id: string; name: string };
  closedAmount: number;
  agencyFee: number;
  directExpense: number;
  net: number;
  gross: number;
  editable: boolean;
}

export interface BackfillDTO {
  id: string;
  dayKey: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  usableNow: boolean;
  requester: { id: string; name: string };
  createdAt: string;
}

export interface HabitStats {
  streak: number;
  fillNum: number;
  fillDen: number;
  filledToday: boolean;
}

export function parseCats(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
