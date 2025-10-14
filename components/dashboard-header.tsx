"use client"

import { Button } from "@/components/ui/button"
import { Plus, Upload } from "lucide-react"
import { SettingsDialog } from "@/components/settings-dialog"

interface DashboardHeaderProps {
  onAddAssignment: () => void
  onUploadSyllabus: () => void
}

export function DashboardHeader({ onAddAssignment, onUploadSyllabus }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{"[HOLD]"}</h1>
        <p className="text-muted-foreground mt-1">Track your coursework and deadlines</p>
      </div>
      <div className="flex gap-2">
        <SettingsDialog />
        <Button onClick={onUploadSyllabus} variant="outline" size="lg" className="gap-2 bg-transparent">
          <Upload className="h-4 w-4" />
          Upload Syllabus
        </Button>
        <Button onClick={onAddAssignment} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Assignment
        </Button>
      </div>
    </div>
  )
}
