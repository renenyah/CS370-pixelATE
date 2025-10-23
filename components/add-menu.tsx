"use client"

import { Plus, Calendar, Upload, FileText } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface AddMenuProps {
  onAddAssignment: () => void
  onAddClass: () => void
  onUploadSyllabus: () => void
}

export function AddMenu({ onAddAssignment, onAddClass, onUploadSyllabus }: AddMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="lg" className="flex flex-col items-center gap-1 h-auto py-3 px-8 rounded-2xl shadow-lg">
          <Plus className="h-7 w-7" />
          <span className="text-xs font-medium">Add</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onClick={onAddAssignment} className="cursor-pointer py-3">
          <FileText className="mr-2 h-4 w-4" />
          <span>Add Assignment</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddClass} className="cursor-pointer py-3">
          <Calendar className="mr-2 h-4 w-4" />
          <span>Add Class/Lab</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUploadSyllabus} className="cursor-pointer py-3">
          <Upload className="mr-2 h-4 w-4" />
          <span>Upload Syllabus</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
