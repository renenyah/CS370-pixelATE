// context/ClassesContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type ClassFolder = {
  id: string;
  name: string;
  color: string;
  semester?: string;
  year?: number;
};

type ClassesContextValue = {
  classes: ClassFolder[];
  addClass: (input: {
    name: string;
    color: string;
    semester?: string;
    year?: number;
  }) => void;
};

const ClassesContext = createContext<ClassesContextValue | undefined>(
  undefined
);

function nextId(prefix = "c"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useClasses(): ClassesContextValue {
  const ctx = useContext(ClassesContext);
  if (!ctx) {
    throw new Error(
      "useClasses must be used within a ClassesProvider"
    );
  }
  return ctx;
}

export function ClassesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [classes, setClasses] = useState<ClassFolder[]>([]);

  const value = useMemo(
    () => ({
      classes,
      addClass: ({
        name,
        color,
        semester,
        year,
      }: {
        name: string;
        color: string;
        semester?: string;
        year?: number;
      }) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setClasses((prev) => [
          ...prev,
          {
            id: nextId(),
            name: trimmed,
            color,
            semester,
            year,
          },
        ]);
      },
    }),
    [classes]
  );

  return (
    <ClassesContext.Provider value={value}>
      {children}
    </ClassesContext.Provider>
  );
}
