"use client"

import { useState } from "react"
import type { Assignment } from "@/lib/types"
import { DashboardHeader } from "@/components/dashboard-header"
import { AssignmentCard } from "@/components/assignment-card"
import { BottomNav } from "@/components/bottom-nav"
import { CalendarView } from "@/components/calendar-view"
import { AddAssignmentDialog } from "@/components/add-assignment-dialog"
import { AddClassDialog } from "@/components/add-class-dialog"
import { SyllabusParserDialog } from "@/components/syllabus-parser-dialog"
import { StatsDashboard } from "@/components/stats-dashboard"
import { AssignmentDetailDialog } from "@/components/assignment-detail-dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateAssignment } from "@/lib/actions/assignments"

interface DashboardClientProps {
  initialAssignments: Assignment[]
}

export function DashboardClient({ initialAssignments }: DashboardClientProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [currentView, setCurrentView] = useState<"dashboard" | "calendar">("dashboard")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false)
  const [syllabusDialogOpen, setSyllabusDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const { toast } = useToast()

  async function toggleComplete(id: string, completed: boolean) {
    try {
      await updateAssignment(id, { completed })
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, completed } : a)))

      toast({
        title: completed ? "Assignment completed!" : "Assignment reopened",
        description: completed ? "Great work!" : "Keep going!",
      })
    } catch (error) {
      console.error("[v0] Error updating assignment:", error)
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    }
  }

  function handleAddAssignment() {
    setAddDialogOpen(true)
  }

  function handleAddClass() {
    setAddClassDialogOpen(true)
  }

  function handleUploadSyllabus() {
    setSyllabusDialogOpen(true)
  }

  function handleAssignmentClick(assignment: Assignment) {
    setSelectedAssignment(assignment)
    setDetailDialogOpen(true)
  }

  function refreshAssignments() {
    window.location.reload()
  }

  const sortedAssignments = [...assignments].sort((a, b) => {
    const now = new Date()
    const aDate = new Date(a.due_date)
    const bDate = new Date(b.due_date)
    const aOverdue = aDate < now && !a.completed
    const bOverdue = bDate < now && !b.completed

    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    if (a.completed && !b.completed) return 1
    if (!a.completed && b.completed) return -1

    return aDate.getTime() - bDate.getTime()
  })

  if (currentView === "calendar") {
    return (
      <>
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
            <CalendarView assignments={assignments} />
          </div>
        </div>
        <BottomNav
          currentView={currentView}
          onViewChange={setCurrentView}
          onAddAssignment={handleAddAssignment}
          onAddClass={handleAddClass}
          onUploadSyllabus={handleUploadSyllabus}
        />
        <AddAssignmentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={refreshAssignments} />
        <AddClassDialog open={addClassDialogOpen} onOpenChange={setAddClassDialogOpen} onSuccess={refreshAssignments} />
        <SyllabusParserDialog
          open={syllabusDialogOpen}
          onOpenChange={setSyllabusDialogOpen}
          onSuccess={refreshAssignments}
        />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24 flex justify-center px-4">
        <div className="w-full max-w-5xl py-8 space-y-8">
          <DashboardHeader onAddAssignment={handleAddAssignment} onUploadSyllabus={handleUploadSyllabus} />

          {assignments.length > 0 && (
            <StatsDashboard
              assignments={assignments}
              onToggleComplete={toggleComplete}
              onAssignmentClick={handleAssignmentClick}
            />
          )}

          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Plus className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">No assignments yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">Get started by adding your first assignment</p>
              <Button onClick={handleAddAssignment} size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAssignments.map((assignment) => (
                <div key={assignment.id} onClick={() => handleAssignmentClick(assignment)} className="cursor-pointer">
                  <AssignmentCard assignment={assignment} onToggleComplete={toggleComplete} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav
        currentView={currentView}
        onViewChange={setCurrentView}
        onAddAssignment={handleAddAssignment}
        onAddClass={handleAddClass}
        onUploadSyllabus={handleUploadSyllabus}
      />
      <AddAssignmentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={refreshAssignments} />
      <AddClassDialog open={addClassDialogOpen} onOpenChange={setAddClassDialogOpen} onSuccess={refreshAssignments} />
      <SyllabusParserDialog
        open={syllabusDialogOpen}
        onOpenChange={setSyllabusDialogOpen}
        onSuccess={refreshAssignments}
      />
      <AssignmentDetailDialog
        assignment={selectedAssignment}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSuccess={refreshAssignments}
      />
    </>
  )
}
