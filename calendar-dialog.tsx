"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function CalendarDialog() {
  const [date, setDate] = React.useState(new Date())
  const [open, setOpen] = React.useState(false)

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Show Calendar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] h-[90vh]">
        <DialogHeader className="flex-row justify-between items-center">
          <DialogTitle className="text-xl">
            {date.toLocaleString("default", { month: "long", year: "numeric" })}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              today
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
        </DialogHeader>
        <div className="grid grid-cols-7 text-sm font-medium">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-4 text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-sm gap-px bg-muted">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`bg-background p-2 min-h-[100px] ${
                !day.isCurrentMonth ? "text-muted-foreground" : ""
              } ${isToday(day) ? "bg-muted/50" : ""}`}
            >
              <div className="font-medium">{day.date}</div>
              <Button
                variant="secondary"
                className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                0 Orders
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
