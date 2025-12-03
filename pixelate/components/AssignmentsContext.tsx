// components/AssignmentsContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type Priority = "high" | "medium" | "low";

export type AssignmentType =
  | "Assignment"
  | "Discussion"
  | "Reading"
  | "Art"
  | "Quiz"
  | "Test"
  | "Project"
  | "Presentation"
  | "Other";

export type Assignment = {
  id: string;
  title: string;
  course: string;
  dueISO?: string | null;
  priority: Priority;
  type?: AssignmentType;
  description?: string;
  source?: string;
  page?: number | null;

  // Optional metadata for folders / filters
  semester?: string;
  year?: number;
  color?: string;
};

export type Draft = {
  id: string;
  title: string;
  course: string;
  type: AssignmentType;
  dueISO?: string | null;
  description?: string;

  semester?: string;
  year?: number;
  semesterLabel?: string;
  color?: string;
};

export type ClassFolder = {
  id: string;
  name: string;
  color: string;
  semester?: string;
  year?: number;
};

type AddClassFolderInput = {
  name: string;
  color: string;
  semester?: string;
  year?: number;
};

type AssignmentsContextValue = {
  assignments: Assignment[];
  classes: ClassFolder[];
  addAssignmentsFromDrafts: (drafts: Draft[]) => void;
  addClassFolder: (input: AddClassFolderInput) => void;
};

// ---------- Context / hook ----------

const AssignmentsContext = createContext<
  AssignmentsContextValue | undefined
>(undefined);

export function useAssignments(): AssignmentsContextValue {
  const ctx = useContext(AssignmentsContext);
  if (!ctx) {
    throw new Error(
      "useAssignments must be used within an AssignmentsProvider"
    );
  }
  return ctx;
}

// ---------- date & priority helpers ----------

export const todayISO: string = new Date()
  .toISOString()
  .slice(0, 10);

export function safeISO(input?: string | null): string | null {
  if (!input) return null;

  // already ISO yyyy-mm-dd?
  const isoMatch = input.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return isoMatch[0];

  // try Date()
  const d = new Date(input);
  if (!isNaN(d.getTime()))
    return d.toISOString().slice(0, 10);

  // try MM/DD/YYYY or M-D-YYYY
  const mdy = input.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  );
  if (mdy) {
    const m = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    const y =
      mdy[3].length === 2
        ? Number("20" + mdy[3])
        : Number(mdy[3]);
    const dt = new Date(y, m, day);
    if (!isNaN(dt.getTime()))
      return dt.toISOString().slice(0, 10);
  }

  return null;
}

export function isSameISO(
  a?: string | null,
  b?: string | null
): boolean {
  return a && b ? a === b : false;
}

export function isOverdue(
  iso?: string | null
): boolean {
  if (!iso) return false;
  return iso < todayISO;
}

export function within7Days(
  iso?: string | null
): boolean {
  if (!iso) return false;
  const a = new Date(iso + "T00:00:00");
  const b = new Date(todayISO + "T00:00:00");
  const diff =
    (a.getTime() - b.getTime()) /
    (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

export function priorityFromISO(
  iso?: string | null
): Priority {
  if (!iso) return "low";
  if (isSameISO(iso, todayISO)) return "high";
  if (within7Days(iso)) return "medium";
  return "low";
}

function nextId(prefix = "a"): string {
  return `${prefix}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ---------- Provider ----------

export function AssignmentsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [assignments, setAssignments] = useState<
    Assignment[]
  >([]);
  const [classes, setClasses] = useState<ClassFolder[]>(
    []
  );

  const value: AssignmentsContextValue = useMemo(
    () => ({
      assignments,
      classes,

      addAssignmentsFromDrafts: (drafts: Draft[]) => {
        if (!drafts?.length) return;
        setAssignments((prev) => [
          ...prev,
          ...drafts.map((d) => ({
            id: nextId("a"),
            title: d.title,
            course: d.course,
            dueISO: d.dueISO || null,
            priority: priorityFromISO(d.dueISO || null),
            type: d.type,
            description: d.description,
            source: "parsed",
            page: null,
            semester: d.semester,
            year: d.year,
            color: d.color,
          })),
        ]);
      },

      addClassFolder: ({
        name,
        color,
        semester,
        year,
      }: AddClassFolderInput) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        setClasses((prev) => {
          // avoid exact duplicates by name + semester/year
          const exists = prev.some(
            (c) =>
              c.name.toLowerCase() ===
                trimmed.toLowerCase() &&
              (c.semester || "") === (semester || "") &&
              (c.year ?? undefined) ===
                (year ?? undefined)
          );
          if (exists) return prev;

          return [
            ...prev,
            {
              id: nextId("c"),
              name: trimmed,
              color,
              semester,
              year,
            },
          ];
        });
      },
    }),
    [assignments, classes]
  );

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}
