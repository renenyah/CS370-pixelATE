"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { Assignment } from "@/lib/types"
import { isSameDay, format } from "date-fns"
import { AssignmentDetailDialog } from "./assignment-detail-dialog"

interface CalendarViewProps {
  assignments: Assignment[]
}

export function CalendarView({ assignments }: CalendarViewProps) {
  const [date, setDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [selectedDateAssignments, setSelectedDateAssignments] = React.useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = React.useState<Assignment | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [showLabs, setShowLabs] = React.useState(true)
  const [showAssignments, setShowAssignments] = React.useState(true)

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      const isLab =
        assignment.is_recurring ||
        (assignment.assignment_type === "lab" && (assignment.start_time || assignment.end_time))
      if (isLab && !showLabs) return false
      if (!isLab && !showAssignments) return false
      return true
    })
  }, [assignments, showLabs, showAssignments])

  const navigateMonth = (direction: "prev" | "next") => {
    setDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setDate(new Date())
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()

    const previousMonth = new Date(year, month, 0)
    const daysInPreviousMonth = previousMonth.getDate()

    const days = []

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: daysInPreviousMonth - i,
        isCurrentMonth: false,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        month: month,
        year: year,
      })
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
      })
    }

    return days
  }

  const days = getDaysInMonth(date)
  const today = new Date()
  const isToday = (day: any) => {
    return day.date === today.getDate() && day.month === today.getMonth() && day.year === today.getFullYear()
  }

  const isRecurringEventOnDay = (assignment: Assignment, dayDate: Date): boolean => {
    if (!assignment.is_recurring || !assignment.recurrence_days || assignment.recurrence_days.length === 0) {
      return false
    }

    const startDate = new Date(assignment.due_date)
    const endDate = assignment.recurrence_end_date
      ? new Date(assignment.recurrence_end_date)
      : new Date(startDate.getFullYear(), 11, 31)

    // Check if the day is within the recurrence range
    if (dayDate < startDate || dayDate > endDate) {
      return false
    }

    // Check if the day of week matches the recurrence pattern
    const dayOfWeek = dayDate.getDay()
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    return assignment.recurrence_days.includes(dayNames[dayOfWeek])
  }

  const getAssignmentsForDay = (day: any) => {
    const dayDate = new Date(day.year, day.month, day.date)
    return filteredAssignments.filter((assignment) => {
      const matchesDueDate = isSameDay(new Date(assignment.due_date), dayDate)
      const isRecurringMatch = isRecurringEventOnDay(assignment, dayDate)
      return matchesDueDate || isRecurringMatch
    })
  }

  const handleDateClick = (day: any) => {
    const dayDate = new Date(day.year, day.month, day.date)
    const dayAssignments = getAssignmentsForDay(day)
    setSelectedDate(dayDate)
    setSelectedDateAssignments(dayAssignments)
  }

  const handleAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setDetailDialogOpen(true)
  }

  const handleAssignmentSuccess = () => {
    setDetailDialogOpen(false)
    setSelectedDate(null)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            {date.toLocaleString("default", { month: "long", year: "numeric" })}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            <Switch id="show-labs" checked={showLabs} onCheckedChange={setShowLabs} />
            <Label htmlFor="show-labs" className="cursor-pointer">
              Labs / Class Times
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="show-assignments" checked={showAssignments} onCheckedChange={setShowAssignments} />
            <Label htmlFor="show-assignments" className="cursor-pointer">
              Assignments
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-7 text-sm font-medium border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {days.map((day, idx) => {
            const dayAssignments = getAssignmentsForDay(day)
            return (
              <div
                key={idx}
                onClick={() => handleDateClick(day)}
                className="bg-card p-3 min-h-[120px] flex flex-col cursor-pointer hover:bg-accent/50 transition-colors"
                style={
                  !day.isCurrentMonth
                    ? { backgroundColor: "rgba(255, 255, 255, 0.3)", color: "rgba(0, 0, 0, 0.5)" }
                    : {}
                }
              >
                <div className="font-medium mb-2">{day.date}</div>
                <div className="space-y-1 flex-1">
                  {dayAssignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment.id}
                      className="text-xs p-1.5 rounded bg-primary/20 text-primary-foreground truncate"
                    >
                      {assignment.start_time && <span className="font-semibold">{assignment.start_time} </span>}
                      {assignment.title}
                    </div>
                  ))}
                  {dayAssignments.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayAssignments.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDateAssignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No assignments due on this date</p>
            ) : (
              selectedDateAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => handleAssignmentClick(assignment)}
                  className="p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                  style={
                    assignment.completed
                      ? { backgroundColor: "rgba(255, 191, 0, 0.1)", borderColor: "rgba(255, 191, 0, 0.5)" }
                      : {}
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-balance">{assignment.title}</h4>
                      {(assignment.start_time || assignment.end_time) && (
                        <p className="text-sm font-medium text-primary">
                          {assignment.start_time} - {assignment.end_time}
                        </p>
                      )}
                      {assignment.course_name && (
                        <p className="text-sm text-muted-foreground">{assignment.course_name}</p>
                      )}
                      {assignment.assignment_type && (
                        <span className="inline-block text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">
                          {assignment.assignment_type}
                        </span>
                      )}
                    </div>
                    {assignment.completed && <span className="text-xs font-medium text-chart-2">Completed</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AssignmentDetailDialog
        assignment={selectedAssignment}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
