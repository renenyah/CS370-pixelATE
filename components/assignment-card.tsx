"use client"

import type { Assignment } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, FileText, GraduationCap, Beaker, ClipboardList, BookMarked } from "lucide-react"
import { format, isPast, isToday, isTomorrow } from "date-fns"

interface AssignmentCardProps {
  assignment: Assignment
  onToggleComplete: (id: string, completed: boolean) => void
}

export function AssignmentCard({ assignment, onToggleComplete }: AssignmentCardProps) {
  const dueDate = new Date(assignment.due_date)
  const isOverdue = isPast(dueDate) && !assignment.completed
  const isDueToday = isToday(dueDate)
  const isDueTomorrow = isTomorrow(dueDate)

  const getDueDateLabel = () => {
    if (isDueToday) return "Due Today"
    if (isDueTomorrow) return "Due Tomorrow"
    if (isOverdue) return "Overdue"
    return format(dueDate, "MMM d, yyyy")
  }

  const getDueDateColor = () => {
    if (isOverdue) return "text-destructive"
    if (isDueToday) return "text-primary"
    if (isDueTomorrow) return "text-chart-2"
    return "text-muted-foreground"
  }

  const getTypeIcon = () => {
    switch (assignment.assignment_type) {
      case "reading":
        return <BookMarked className="h-3.5 w-3.5" />
      case "exam":
      case "quiz":
        return <GraduationCap className="h-3.5 w-3.5" />
      case "project":
        return <ClipboardList className="h-3.5 w-3.5" />
      case "paper":
        return <FileText className="h-3.5 w-3.5" />
      case "lab":
        return <Beaker className="h-3.5 w-3.5" />
      default:
        return <BookOpen className="h-3.5 w-3.5" />
    }
  }

  const getTypeLabel = () => {
    if (!assignment.assignment_type) return "Assignment"
    return assignment.assignment_type.charAt(0).toUpperCase() + assignment.assignment_type.slice(1)
  }

  return (
    <Card className={`transition-all hover:shadow-md ${assignment.completed ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={assignment.completed}
              onCheckedChange={(checked) => onToggleComplete(assignment.id, checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <CardTitle className={`text-lg leading-tight ${assignment.completed ? "line-through" : ""}`}>
                {assignment.title}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {assignment.course_name && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{assignment.course_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {getTypeIcon()}
                  <span>{getTypeLabel()}</span>
                </div>
              </div>
            </div>
          </div>
          <Badge variant={isOverdue ? "destructive" : isDueToday ? "default" : "secondary"} className="shrink-0">
            {getDueDateLabel()}
          </Badge>
        </div>
      </CardHeader>
      {assignment.description && (
        <CardContent className="pt-0">
          <CardDescription className="text-sm leading-relaxed">{assignment.description}</CardDescription>
        </CardContent>
      )}
    </Card>
  )
}
