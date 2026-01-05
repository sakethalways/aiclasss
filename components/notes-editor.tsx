"use client"

import { useCallback, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Download, Save, Trash2, Edit2, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Note {
  id: string
  lecture_id: string
  content: string
  created_at: string
  updated_at: string
}

interface NotesEditorProps {
  lectureId: string
  note: Note | null
  onSave?: (note: Note) => void
  onDelete?: (noteId: string) => void
}

export function NotesEditor({ lectureId, note, onSave, onDelete }: NotesEditorProps) {
  const [content, setContent] = useState(note?.content || "")
  const [currentNote, setCurrentNote] = useState<Note | null>(note)
  const [isEditing, setIsEditing] = useState(!note)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setContent(note?.content || "")
    setCurrentNote(note)
    setIsEditing(!note)
  }, [note])

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast({
        title: "Empty Notes",
        description: "Please write something before saving",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, content }),
      })

      if (!response.ok) throw new Error("Failed to save notes")

      const { data: savedNote } = await response.json()

      // Create note object with all required fields
      const noteObject: Note = savedNote || {
        id: lectureId,
        lecture_id: lectureId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Update local state
      setCurrentNote(noteObject)
      setContent(noteObject.content)
      setIsEditing(false)

      // Call parent callback with full note object
      onSave?.(noteObject)

      toast({
        title: "Success",
        description: "Notes saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [content, lectureId, onSave, toast])

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `notes-${lectureId}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded",
      description: "Notes downloaded successfully",
    })
  }

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, noteId: note?.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete notes")
      }

      setShowDeleteConfirm(false)
      setContent("")
      setCurrentNote(null)
      setIsEditing(true)

      toast({
        title: "Success",
        description: "Notes deleted successfully",
      })

      onDelete?.(note?.id || "")
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete notes",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lecture Notes</CardTitle>
              <CardDescription>{isEditing ? "Create or edit your notes" : "Your lecture notes"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing ? (
            <>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg min-h-[200px]">
                <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                  {content || "No notes yet"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit Notes
                </Button>
                <Button onClick={handleDownload} variant="outline" className="gap-2 bg-white dark:bg-slate-800">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                {currentNote && (
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" className="gap-2 ml-auto">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="notes">Your Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Write your notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSave} className="gap-2" disabled={isSaving || !content.trim()}>
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Notes"}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    setContent(note?.content || "")
                  }}
                  variant="outline"
                  className="gap-2 bg-white dark:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notes?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
