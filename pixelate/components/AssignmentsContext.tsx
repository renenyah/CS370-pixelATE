// components/AssignmentsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";

// ---- Types ----

export type AssignmentType =
  | "Assignment"
  | "Quiz"
  | "Test"
  | "Project"
  | "Discussion"
  | "Reading"
  | "Art"
  | "Other";

export type Priority = "low" | "medium" | "high";

export type Assignment = {
  id: string;
  title: string;
  course?: string;
  type?: AssignmentType;
  dueISO?: string | null;
  description?: string;
  semester?: string;
  year?: number;
  color?: string;
  completed?: boolean;
  priority?: Priority;
};

export type Draft = {
  id: string;
  title: string;
  course: string;
  type?: AssignmentType;
  dueISO?: string | null;
  description?: string;
  semester?: string;
  year?: number;
  color?: string;
  priority?: Priority;
};

export type ClassFolder = {
  name: string;
  color: string;
  semester?: string;
  year?: number;
};

// ---- Helpers ----

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function safeISO(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export function isSameISO(
  isoA: string | null,
  isoB: string | null
): boolean {
  if (!isoA || !isoB) return false;
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

export function within7Days(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date(todayISO());
  const target = new Date(iso.slice(0, 10));
  const diff =
    (target.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date(todayISO());
  const target = new Date(iso.slice(0, 10));
  return target.getTime() < today.getTime();
}

export function labelFromSemesterYear(
  semester?: string,
  year?: number
): string | null {
  if (!semester || !year) return null;
  return `${semester} ${year}`;
}

// ---- Case-insensitive normalization ----

export function normalizeKey(raw?: string | null): string {
  return (raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// ✅ EXPORTED so other files (UploadSyllabusModal) can import it
export function assignmentIdentityKey(input: {
  course?: string | null;
  title: string;
  dueISO?: string | null;
}) {
  return [
    normalizeKey(input.course),
    normalizeKey(input.title),
    (input.dueISO || "").slice(0, 10),
  ].join("|");
}

// ---- Context shape ----

type AssignmentsContextValue = {
  assignments: Assignment[];
  classes: ClassFolder[];

  addAssignmentsFromDrafts: (drafts: Draft[]) => Promise<void>;
  updateAssignment: (
    id: string,
    patch: Partial<Assignment>
  ) => void;

  addClassFolder: (input: {
    name: string;
    color: string;
    semester?: string;
    year?: number;
  }) => void;

  updateClassFolder: (opts: {
    oldName: string;
    newName: string;
    semester?: string;
    year?: number;
  }) => void;

  toggleAssignmentCompleted: (id: string) => void;
};

const AssignmentsContext =
  createContext<AssignmentsContextValue | null>(null);

export function useAssignments() {
  const ctx = useContext(AssignmentsContext);
  if (!ctx) {
    throw new Error(
      "useAssignments must be used inside AssignmentsProvider"
    );
  }
  return ctx;
}

// ---- Provider ----

export function AssignmentsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(
    []
  );
  const [classes, setClasses] = useState<ClassFolder[]>([]);

  useEffect(() => {
    // TODO: load from Supabase if you want persistence
  }, []);

  // ---------- addAssignmentsFromDrafts with dedupe ----------
  const addAssignmentsFromDrafts =
    useCallback(async (drafts: Draft[]) => {
      if (!drafts || !drafts.length) return;

      setAssignments((prev) => {
        const existingKeys = new Set(
          prev.map((a) =>
            assignmentIdentityKey({
              course: a.course,
              title: a.title,
              dueISO: a.dueISO || null,
            })
          )
        );

        const newAssignments: Assignment[] = [];

        for (const d of drafts) {
          const key = assignmentIdentityKey({
            course: d.course,
            title: d.title,
            dueISO: d.dueISO || null,
          });

          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          const assignment: Assignment = {
            id:
              typeof crypto !== "undefined" &&
              "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            title: d.title.trim(),
            course: d.course?.trim() || "",
            type: d.type,
            dueISO: safeISO(d.dueISO || null),
            description: d.description || "",
            semester: d.semester,
            year: d.year,
            color: d.color,
            completed: false,
            priority: d.priority || "medium",
          };

          newAssignments.push(assignment);
        }

        const merged = [...prev, ...newAssignments];
        // TODO: insert newAssignments into Supabase here if needed
        return merged;
      });
    }, []);

  const updateAssignment = useCallback(
    (id: string, patch: Partial<Assignment>) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        )
      );
      // TODO: sync to Supabase
    },
    []
  );

  // ---------- addClassFolder with case-insensitive duplicate check ----------
  const addClassFolder = useCallback(
    (input: {
      name: string;
      color: string;
      semester?: string;
      year?: number;
    }) => {
      const normalizedNew = normalizeKey(input.name);

      setClasses((prev) => {
        const existing = prev.find(
          (c) => normalizeKey(c.name) === normalizedNew
        );

        if (existing) {
          Alert.alert(
            "Class already exists",
            "You already have a folder for this class. Try editing the existing one instead."
          );
          return prev;
        }

        const newFolder: ClassFolder = {
          name: input.name.trim(),
          color: input.color,
          semester: input.semester,
          year: input.year,
        };

        const next = [...prev, newFolder];
        // TODO: insert newFolder into Supabase here if needed
        return next;
      });
    },
    []
  );

  const updateClassFolder = useCallback(
    ({
      oldName,
      newName,
      semester,
      year,
    }: {
      oldName: string;
      newName: string;
      semester?: string;
      year?: number;
    }) => {
      const oldKey = normalizeKey(oldName);
      const newKey = normalizeKey(newName);

      setClasses((prev) => {
        const updated = prev.map((c) => {
          if (normalizeKey(c.name) !== oldKey) return c;
          return {
            ...c,
            name: newName,
            semester: semester ?? c.semester,
            year: year ?? c.year,
          };
        });

        const byKey = new Map<string, ClassFolder>();
        for (const c of updated) {
          const key = normalizeKey(c.name);
          if (!byKey.has(key)) byKey.set(key, c);
        }
        return Array.from(byKey.values());
      });

      if (oldKey !== newKey) {
        setAssignments((prev) =>
          prev.map((a) =>
            normalizeKey(a.course) === oldKey
              ? { ...a, course: newName }
              : a
          )
        );
      }
    },
    []
  );

  const toggleAssignmentCompleted = useCallback(
    (id: string) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, completed: !a.completed }
            : a
        )
      );
      // TODO: sync to Supabase
    },
    []
  );

  return (
    <AssignmentsContext.Provider
      value={{
        assignments,
        classes,
        addAssignmentsFromDrafts,
        updateAssignment,
        addClassFolder,
        updateClassFolder,
        toggleAssignmentCompleted,
      }}
    >
      {children}
    </AssignmentsContext.Provider>
  );
}
