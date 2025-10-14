"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, FileText, Trash2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createAssignment } from "@/lib/actions/assignments"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AssignmentType } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"

interface ParsedClass {
  title: string
  courseName: string
  days: number[]
  startTime: string
  endTime: string
  startDate: string
  endDate: string
}

interface ParsedAssignment {
  title: string
  description: string
  dueDate: string
  courseName: string
  type: AssignmentType
  startTime?: string
  endTime?: string
}

interface SyllabusParserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SyllabusParserDialog({ open, onOpenChange, onSuccess }: SyllabusParserDialogProps) {
  const [syllabusText, setSyllabusText] = useState("")
  const [courseName, setCourseName] = useState("")
  const [parsedAssignments, setParsedAssignments] = useState<ParsedAssignment[]>([])
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  function parseDays(dayStr: string): number[] {
    const dayMap: Record<string, number> = {
      su: 0,
      m: 1,
      t: 2,
      w: 3,
      th: 4,
      f: 5,
      sa: 6,
    }

    const days: number[] = []
    const lowerStr = dayStr.toLowerCase().replace(/[,\s]/g, "")

    // Handle common patterns like MWF, TR, MW, etc.
    if (lowerStr.includes("mwf")) {
      return [1, 3, 5]
    }
    if (lowerStr.includes("tr") || lowerStr.includes("tuth")) {
      return [2, 4]
    }
    if (lowerStr.includes("mw")) {
      return [1, 3]
    }

    // Parse individual days
    let i = 0
    while (i < lowerStr.length) {
      if (i + 1 < lowerStr.length && lowerStr.substring(i, i + 2) === "th") {
        days.push(4)
        i += 2
      } else if (i + 1 < lowerStr.length && lowerStr.substring(i, i + 2) === "su") {
        days.push(0)
        i += 2
      } else if (i + 1 < lowerStr.length && lowerStr.substring(i, i + 2) === "sa") {
        days.push(6)
        i += 2
      } else if (lowerStr[i] === "m") {
        days.push(1)
        i++
      } else if (lowerStr[i] === "t") {
        days.push(2)
        i++
      } else if (lowerStr[i] === "w") {
        days.push(3)
        i++
      } else if (lowerStr[i] === "f") {
        days.push(5)
        i++
      } else {
        i++
      }
    }

    return [...new Set(days)].sort()
  }

  function parseClassSchedules(text: string, course: string): ParsedClass[] {
    const classes: ParsedClass[] = []
    const lines = text.split("\n")

    // Pattern to match class schedules like "MWF 10:00-11:30 AM" or "TR 2:00-3:15 PM"
    const schedulePattern =
      /((?:M|T|W|Th|F|Sa|Su|MW|MWF|TR|TuTh|MTh)+)[,\s]+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/gi

    for (const line of lines) {
      const matches = [...line.matchAll(schedulePattern)]

      for (const match of matches) {
        const dayStr = match[1]
        const startTimeStr = match[2]
        const endTimeStr = match[3]

        const days = parseDays(dayStr)
        if (days.length === 0) continue

        const startTime = normalizeTime(startTimeStr)
        const endTime = normalizeTime(endTimeStr)

        if (startTime && endTime) {
          // Try to find course name in the same line or nearby
          let classTitle = course || "Class"
          const titleMatch = line.match(/^([^:]+):/)
          if (titleMatch) {
            classTitle = titleMatch[1].trim()
          }

          // Default to current semester dates
          const now = new Date()
          const currentMonth = now.getMonth()
          let startDate: Date
          let endDate: Date

          // If we're in fall semester (Aug-Dec), use Aug-Dec dates
          if (currentMonth >= 7) {
            startDate = new Date(now.getFullYear(), 7, 15) // Mid-August
            endDate = new Date(now.getFullYear(), 11, 15) // Mid-December
          } else {
            // Spring semester (Jan-May)
            startDate = new Date(now.getFullYear(), 0, 15) // Mid-January
            endDate = new Date(now.getFullYear(), 4, 15) // Mid-May
          }

          classes.push({
            title: classTitle,
            courseName: course,
            days,
            startTime,
            endTime,
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          })
        }
      }
    }

    return classes
  }

  function parseSyllabusText(text: string, course: string): ParsedAssignment[] {
    const assignments: ParsedAssignment[] = []
    const lines = text.split("\n")

    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(\d{1,2}-\d{1,2}-\d{2,4})/g,
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)/gi,
    ]

    const timePatterns = [
      /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/gi,
      /(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})/gi,
    ]

    const typeKeywords: Record<AssignmentType, string[]> = {
      reading: ["reading", "read", "chapter"],
      exam: ["exam", "test", "midterm", "final"],
      project: ["project"],
      paper: ["paper", "essay"],
      quiz: ["quiz"],
      lab: ["lab", "laboratory"],
      homework: ["homework", "hw"],
      assignment: ["assignment"],
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      let detectedType: AssignmentType = "assignment"
      const lowerLine = line.toLowerCase()

      for (const [type, keywords] of Object.entries(typeKeywords) as [AssignmentType, string[]][]) {
        if (keywords.some((keyword) => lowerLine.includes(keyword))) {
          detectedType = type
          break
        }
      }

      const allKeywords = Object.values(typeKeywords).flat()
      const hasAssignmentKeyword = allKeywords.some((keyword) => lowerLine.includes(keyword))

      if (hasAssignmentKeyword) {
        let foundDate = ""
        let dateSource = ""
        let startTime = ""
        let endTime = ""

        for (let j = 0; j < 3 && i + j < lines.length; j++) {
          const checkLine = lines[i + j]
          for (const pattern of datePatterns) {
            const matches = checkLine.match(pattern)
            if (matches && matches[0]) {
              foundDate = matches[0]
              dateSource = checkLine
              break
            }
          }
          for (const pattern of timePatterns) {
            const matches = pattern.exec(checkLine)
            if (matches && matches[1] && matches[2]) {
              startTime = normalizeTime(matches[1])
              endTime = normalizeTime(matches[2])
              break
            }
          }
          if (foundDate) break
        }

        if (foundDate) {
          let title = line
            .replace(/^[-•*]\s*/, "")
            .replace(/^\d+\.\s*/, "")
            .replace(/due:?\s*/gi, "")
            .trim()

          if (title.length > 100) {
            const sentenceEnd = title.indexOf(".")
            if (sentenceEnd > 0 && sentenceEnd < 100) {
              title = title.substring(0, sentenceEnd)
            } else {
              title = title.substring(0, 100) + "..."
            }
          }

          let description = ""
          if (i + 1 < lines.length && !lines[i + 1].match(/\d{1,2}[/-]/)) {
            description = lines[i + 1].trim()
          }

          const parsedDate = parseDate(foundDate)

          if (parsedDate) {
            const assignment: ParsedAssignment = {
              title: title || "Untitled Assignment",
              description: description || "",
              dueDate: parsedDate,
              courseName: course || "General",
              type: detectedType,
            }

            if (startTime && endTime) {
              assignment.startTime = startTime
              assignment.endTime = endTime
            }

            assignments.push(assignment)
          }
        }
      }
    }

    return assignments
  }

  function parseDate(dateStr: string): string {
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      let date: Date | null = null

      if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(dateStr)) {
        const parts = dateStr.split(/[/-]/)
        const month = Number.parseInt(parts[0]) - 1
        const day = Number.parseInt(parts[1])
        let year = Number.parseInt(parts[2])

        if (year < 100) {
          year += 2000
        }

        date = new Date(year, month, day)
      } else if (/^\d{1,2}[/-]\d{1,2}$/.test(dateStr)) {
        const parts = dateStr.split(/[/-]/)
        const month = Number.parseInt(parts[0]) - 1
        const day = Number.parseInt(parts[1])

        date = new Date(currentYear, month, day)

        if (date < currentDate) {
          date = new Date(currentYear + 1, month, day)
        }
      } else if (/[A-Za-z]+\.?\s+\d{1,2}(?:,?\s+\d{4})?/.test(dateStr)) {
        const hasYear = /\d{4}/.test(dateStr)

        if (hasYear) {
          date = new Date(dateStr)
        } else {
          const dateWithYear = `${dateStr}, ${currentYear}`
          date = new Date(dateWithYear)

          if (date < currentDate) {
            date = new Date(`${dateStr}, ${currentYear + 1}`)
          }
        }
      }

      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]
      }
    } catch (error) {
      console.error("[v0] Error parsing date:", error)
    }
    return ""
  }

  function normalizeTime(timeStr: string): string {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/)
    if (!match) return ""

    let hours = Number.parseInt(match[1])
    const minutes = match[2]
    const meridiem = match[3]?.toUpperCase()

    if (meridiem === "PM" && hours !== 12) {
      hours += 12
    } else if (meridiem === "AM" && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, "0")}:${minutes}`
  }

  function handleParse() {
    if (!syllabusText.trim()) {
      toast({
        title: "Error",
        description: "Please paste syllabus text",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const parsed = parseSyllabusText(syllabusText, courseName)
      const classes = parseClassSchedules(syllabusText, courseName)

      setParsedAssignments(parsed)
      setParsedClasses(classes)

      if (parsed.length === 0 && classes.length === 0) {
        toast({
          title: "No items found",
          description: "Try pasting text with dates, assignment names, or class schedules (e.g., MWF 10:00-11:30 AM)",
          variant: "destructive",
        })
      } else {
        const totalItems = parsed.length + classes.length
        toast({
          title: "Success!",
          description: `Found ${parsed.length} assignment${parsed.length !== 1 ? "s" : ""} and ${classes.length} class schedule${classes.length !== 1 ? "s" : ""}`,
        })
      }
    } catch (error) {
      console.error("[v0] Error parsing syllabus:", error)
      toast({
        title: "Error",
        description: "Failed to parse syllabus text",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  function removeAssignment(index: number) {
    setParsedAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  function removeClass(index: number) {
    setParsedClasses((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAssignment(index: number, field: keyof ParsedAssignment, value: string) {
    setParsedAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  function updateClass(index: number, field: keyof ParsedClass, value: any) {
    setParsedClasses((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function toggleClassDay(classIndex: number, day: number) {
    setParsedClasses((prev) =>
      prev.map((c, i) => {
        if (i !== classIndex) return c
        const days = c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day].sort()
        return { ...c, days }
      }),
    )
  }

  async function handleSaveAll() {
    if (parsedAssignments.length === 0 && parsedClasses.length === 0) return

    setIsSaving(true)
    try {
      for (const assignment of parsedAssignments) {
        await createAssignment({
          title: assignment.title,
          description: assignment.description || null,
          due_date: assignment.dueDate,
          course_name: assignment.courseName || null,
          assignment_type: assignment.type,
          completed: false,
          start_time: assignment.startTime || null,
          end_time: assignment.endTime || null,
          is_recurring: false,
          recurrence_days: null,
          recurrence_end_date: null,
        })
      }

      for (const classSchedule of parsedClasses) {
        await createAssignment({
          title: classSchedule.title,
          description: null,
          due_date: classSchedule.startDate,
          course_name: classSchedule.courseName || null,
          assignment_type: "lab",
          completed: false,
          start_time: classSchedule.startTime,
          end_time: classSchedule.endTime,
          is_recurring: true,
          recurrence_days: classSchedule.days,
          recurrence_end_date: classSchedule.endDate,
        })
      }

      const totalItems = parsedAssignments.length + parsedClasses.length
      toast({
        title: "Success!",
        description: `Added ${totalItems} item${totalItems > 1 ? "s" : ""}`,
      })

      setSyllabusText("")
      setCourseName("")
      setParsedAssignments([])
      setParsedClasses([])
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("[v0] Error saving items:", error)
      toast({
        title: "Error",
        description: "Failed to save items",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setSyllabusText(text)
    }
    reader.readAsText(file)
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Syllabus</DialogTitle>
          <DialogDescription>
            Paste your syllabus text or upload a text file. We'll extract assignments, dates, and class schedules
            automatically.
          </DialogDescription>
        </DialogHeader>

        {parsedAssignments.length === 0 && parsedClasses.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="e.g., Computer Science 101"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syllabusText">Syllabus Text</Label>
              <Textarea
                id="syllabusText"
                placeholder="Paste your syllabus text here... Include assignment names, due dates, and class schedules (e.g., MWF 10:00-11:30 AM)."
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="fileUpload" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="h-4 w-4" />
                    Or upload a text file
                  </div>
                  <Input id="fileUpload" type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parse Syllabus
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {parsedAssignments.length} assignment{parsedAssignments.length !== 1 ? "s" : ""} and{" "}
                {parsedClasses.length} class schedule{parsedClasses.length !== 1 ? "s" : ""}. Review and edit before
                saving.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setParsedAssignments([])
                  setParsedClasses([])
                }}
              >
                Start Over
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {parsedClasses.map((classSchedule, index) => (
                <Card key={`class-${index}`} className="p-4 space-y-3 border-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-primary/20 text-primary">
                          RECURRING CLASS
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Class Title</Label>
                        <Input
                          value={classSchedule.title}
                          onChange={(e) => updateClass(index, "title", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Course Name</Label>
                        <Input
                          value={classSchedule.courseName}
                          onChange={(e) => updateClass(index, "courseName", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Days of Week</Label>
                        <div className="flex gap-2">
                          {dayNames.map((day, dayIndex) => (
                            <div key={dayIndex} className="flex items-center gap-1">
                              <Checkbox
                                id={`class-${index}-day-${dayIndex}`}
                                checked={classSchedule.days.includes(dayIndex)}
                                onCheckedChange={() => toggleClassDay(index, dayIndex)}
                              />
                              <Label htmlFor={`class-${index}-day-${dayIndex}`} className="text-xs cursor-pointer">
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="time"
                            value={classSchedule.startTime}
                            onChange={(e) => updateClass(index, "startTime", e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Time</Label>
                          <Input
                            type="time"
                            value={classSchedule.endTime}
                            onChange={(e) => updateClass(index, "endTime", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date (First Day of Class)</Label>
                          <Input
                            type="date"
                            value={classSchedule.startDate}
                            onChange={(e) => updateClass(index, "startDate", e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date (Last Day of Class)</Label>
                          <Input
                            type="date"
                            value={classSchedule.endDate}
                            onChange={(e) => updateClass(index, "endDate", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeClass(index)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Regular assignments */}
              {parsedAssignments.map((assignment, index) => (
                <Card key={`assignment-${index}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={assignment.title}
                          onChange={(e) => updateAssignment(index, "title", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Course</Label>
                          <Input
                            value={assignment.courseName}
                            onChange={(e) => updateAssignment(index, "courseName", e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={assignment.type}
                            onValueChange={(value) => updateAssignment(index, "type", value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assignment">Assignment</SelectItem>
                              <SelectItem value="reading">Reading</SelectItem>
                              <SelectItem value="exam">Exam</SelectItem>
                              <SelectItem value="project">Project</SelectItem>
                              <SelectItem value="paper">Paper</SelectItem>
                              <SelectItem value="homework">Homework</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="lab">Lab</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Due Date</Label>
                          <Input
                            type="date"
                            value={assignment.dueDate}
                            onChange={(e) => updateAssignment(index, "dueDate", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                      {(assignment.startTime || assignment.endTime || assignment.type === "lab") && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Start Time (optional)</Label>
                            <Input
                              type="time"
                              value={assignment.startTime || ""}
                              onChange={(e) => updateAssignment(index, "startTime", e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">End Time (optional)</Label>
                            <Input
                              type="time"
                              value={assignment.endTime || ""}
                              onChange={(e) => updateAssignment(index, "endTime", e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Description (optional)</Label>
                        <Textarea
                          value={assignment.description}
                          onChange={(e) => updateAssignment(index, "description", e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAssignment(index)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save All Items
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
