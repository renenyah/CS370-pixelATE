"use client"

import { useState } from "react"
import { Settings, Trash2, CalendarIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { clearAllData } from "@/lib/actions/assignments"
import { useRouter } from "next/navigation"

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const router = useRouter()

  const handleClearAllData = async () => {
    setIsClearing(true)
    try {
      await clearAllData()
      setShowClearDialog(false)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to clear data:", error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your app preferences and integrations</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Calendar Integrations */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Calendar Integrations</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" disabled>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Connect Google Calendar</span>
                  <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" disabled>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Connect Apple Calendar</span>
                  <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Data Management */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Data Management</h3>
              <Button
                variant="destructive"
                className="w-full justify-start gap-3"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All Data</span>
              </Button>
              <p className="text-xs text-muted-foreground">
                This will permanently delete all assignments, labs, and classes from your account.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your assignments, labs, and classes from
              the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? "Clearing..." : "Delete Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
