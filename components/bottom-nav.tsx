"use client"

import { Home, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AddMenu } from "@/components/add-menu"

interface BottomNavProps {
  currentView: "dashboard" | "calendar"
  onViewChange: (view: "dashboard" | "calendar") => void
  onAddAssignment: () => void
  onAddClass: () => void
  onUploadSyllabus: () => void
}

export function BottomNav({
  currentView,
  onViewChange,
  onAddAssignment,
  onAddClass,
  onUploadSyllabus,
}: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container max-w-5xl">
        <div className="flex py-2 shadow-sm px-3.5 font-medium text-center justify-evenly items-center flex-row gap-0">
          {/* Home/Dashboard Button */}
          <Button
            variant="ghost"
            size="lg"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-3 px-6",
              currentView === "dashboard" && "text-primary",
            )}
            onClick={() => onViewChange("dashboard")}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Home</span>
          </Button>

          <AddMenu onAddAssignment={onAddAssignment} onAddClass={onAddClass} onUploadSyllabus={onUploadSyllabus} />

          {/* Calendar Button */}
          <Button
            variant="ghost"
            size="lg"
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-3 px-6",
              currentView === "calendar" && "text-primary",
            )}
            onClick={() => onViewChange("calendar")}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-xs font-medium">Calendar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
