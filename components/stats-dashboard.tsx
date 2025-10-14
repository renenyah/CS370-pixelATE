"use client"

import { useState } from "react"
import type { Assignment } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react"
import { isAfter, isBefore, addDays, isPast } from "date-fns"
import { AssignmentCard } from "@/components/assignment-card"

interface StatsDashboardProps {
  assignments: Assignment[]
  onToggleComplete: (id: string, completed: boolean) => void
  onAssignmentClick: (assignment: Assignment) => void
}

export function StatsDashboard({ assignments, onToggleComplete, onAssignmentClick }: StatsDashboardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"upcoming" | "overdue">("upcoming")

  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)

  // Calculate stats
  const upcomingAssignments = assignments.filter((a) => {
    const dueDate = new Date(a.due_date)
    return isAfter(dueDate, now) && isBefore(dueDate, sevenDaysFromNow)
  })

  const overdueAssignments = assignments.filter((a) => {
    const dueDate = new Date(a.due_date)
    return isPast(dueDate) && !a.completed
  })

  const completedUpcoming = upcomingAssignments.filter((a) => a.completed).length
  const completionPercentage =
    upcomingAssignments.length > 0 ? (completedUpcoming / upcomingAssignments.length) * 100 : 0

  const handleCardClick = (type: "upcoming" | "overdue") => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const dialogAssignments = dialogType === "upcoming" ? upcomingAssignments : overdueAssignments
  const dialogTitle = dialogType === "upcoming" ? "Due in Next 7 Days" : "Overdue Assignments"

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Due in Next 7 Days */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => handleCardClick("upcoming")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due in Next 7 Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{upcomingAssignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{completedUpcoming} completed</p>
          </CardContent>
        </Card>

        {/* Overdue Assignments */}
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
          onClick={() => handleCardClick("overdue")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{overdueAssignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueAssignments.length === 0 ? "All caught up!" : "Need attention"}
            </p>
          </CardContent>
        </Card>

        {/* Completion Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-2">{Math.round(completionPercentage)}%</div>
            <Progress value={completionPercentage} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for showing list */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === "upcoming" ? (
                <>
                  <Calendar className="h-5 w-5 text-primary" />
                  {dialogTitle}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  {dialogTitle}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {dialogAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {dialogType === "upcoming" ? "No assignments due in the next 7 days" : "No overdue assignments"}
              </div>
            ) : (
              dialogAssignments.map((assignment) => (
                <div key={assignment.id} onClick={() => onAssignmentClick(assignment)}>
                  <AssignmentCard assignment={assignment} onToggleComplete={onToggleComplete} />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
