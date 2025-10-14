"use client"

import { useState } from "react"
import type { Assignment } from "@/lib/types"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, BookOpen, Trash2, Edit2, Check } from "lucide-react"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { updateAssignment, deleteAssignment } from "@/lib/actions/assignments"
import { useToast } from "@/hooks/use-toast"

interface AssignmentDetailDialogProps {
  assignment: Assignment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignmentDetailDialog({ assignment, open, onOpenChange, onSuccess }: AssignmentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [courseName, setCourseName] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [assignmentType, setAssignmentType] = useState<Assignment["assignment_type"]>("homework")

  // Initialize form when assignment changes
  useState(() => {
    if (assignment) {
      setTitle(assignment.title)
      setDescription(assignment.description || "")
      setCourseName(assignment.course_name || "")
      setDueDate(assignment.due_date)
      setAssignmentType(assignment.assignment_type || "homework")
    }
  })

  if (!assignment) return null

  const dueDate_obj = new Date(assignment.due_date)
  const isOverdue = isPast(dueDate_obj) && !assignment.completed
  const isDueToday = isToday(dueDate_obj)
  const isDueTomorrow = isTomorrow(dueDate_obj)

  const getDueDateLabel = () => {
    if (isDueToday) return "Due Today"
    if (isDueTomorrow) return "Due Tomorrow"
    if (isOverdue) return "Overdue"
    return format(dueDate_obj, "MMMM d, yyyy")
  }

  const handleEdit = () => {
    setTitle(assignment.title)
    setDescription(assignment.description || "")
    setCourseName(assignment.course_name || "")
    setDueDate(assignment.due_date)
    setAssignmentType(assignment.assignment_type || "homework")
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateAssignment(assignment.id, {
        title,
        description,
        course_name: courseName,
        due_date: dueDate,
        assignment_type: assignmentType,
      })
      toast({
        title: "Assignment updated",
        description: "Your changes have been saved.",
      })
      setIsEditing(false)
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    setIsLoading(true)
    try {
      await deleteAssignment(assignment.id)
      toast({
        title: "Assignment deleted",
        description: "The assignment has been removed.",
      })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkComplete = async () => {
    setIsLoading(true)
    try {
      await updateAssignment(assignment.id, { completed: true })
      toast({
        title: "Assignment completed!",
        description: "Great work!",
      })
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark assignment as complete",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Assignment Details</span>
            <Badge
              variant={isOverdue ? "destructive" : isDueToday ? "default" : "secondary"}
              className={assignment.completed ? "bg-chart-2 text-white" : ""}
            >
              {assignment.completed ? "Completed" : getDueDateLabel()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          // View Mode
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-balance">{assignment.title}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course
                </div>
                <div className="font-medium">{assignment.course_name || "No course"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </div>
                <div className="font-medium">{format(dueDate_obj, "MMMM d, yyyy")}</div>
              </div>
            </div>

            {assignment.assignment_type && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Type</div>
                <Badge variant="outline" className="capitalize">
                  {assignment.assignment_type}
                </Badge>
              </div>
            )}

            {assignment.description && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Description</div>
                <p className="text-sm leading-relaxed text-pretty">{assignment.description}</p>
              </div>
            )}

            <Separator />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={handleEdit} disabled={isLoading} className="gap-2 bg-transparent">
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
              {!assignment.completed && (
                <Button
                  onClick={handleMarkComplete}
                  disabled={isLoading}
                  className="gap-2 bg-chart-2 hover:bg-chart-2/90"
                >
                  <Check className="h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course">Course Name</Label>
              <Input id="edit-course" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Assignment Type</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => setAssignmentType(value as Assignment["assignment_type"])}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="paper">Paper</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Due Date</Label>
              <Input id="edit-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
