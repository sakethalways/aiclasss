"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit, Plus } from "lucide-react"

interface Subject {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  created_at: string
  updated_at: string
}

interface SubjectsManagerProps {
  onSubjectCreated?: (subject: Subject) => void
}

export function SubjectsManager({ onSubjectCreated }: SubjectsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "BookOpen",
  })

  const { toast } = useToast()

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/subjects")
      if (!response.ok) throw new Error("Failed to fetch subjects")
      const { data } = await response.json()
      setSubjects(data || [])
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setFormData({
        name: subject.name,
        description: subject.description || "",
        color: subject.color,
        icon: subject.icon,
      })
      setEditingId(subject.id)
      setIsEditing(true)
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "BookOpen",
      })
      setEditingId(null)
      setIsEditing(false)
    }
    setIsOpen(true)
  }

  const handleCloseDialog = () => {
    setIsOpen(false)
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "BookOpen",
    })
    setEditingId(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject name is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const method = isEditing ? "PUT" : "POST"
      const url = isEditing ? `/api/subjects/${editingId}` : "/api/subjects"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save subject")
      }

      const { data } = await response.json()

      if (isEditing) {
        setSubjects((prev) => prev.map((s) => (s.id === editingId ? data : s)))
        toast({
          title: "Success",
          description: "Subject updated successfully",
        })
      } else {
        setSubjects((prev) => [data, ...prev])
        onSubjectCreated?.(data)
        toast({
          title: "Success",
          description: "Subject created successfully",
        })
      }

      handleCloseDialog()
    } catch (error) {
      console.error("Error saving subject:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save subject",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete subject")

      setSubjects((prev) => prev.filter((s) => s.id !== id))
      setDeleteConfirmId(null)

      toast({
        title: "Success",
        description: "Subject deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting subject:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete subject",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const colorOptions = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#6366F1", // Indigo
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Subjects</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subjects.length} subject(s)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          New Subject
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border rounded-lg">
          <p>No subjects yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="p-4 border rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              style={{ borderLeftColor: subject.color, borderLeftWidth: "4px" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                    {subject.name}
                  </h4>
                  {subject.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-2">
                  <Button
                    onClick={() => handleOpenDialog(subject)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirmId(subject.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Subject" : "Create New Subject"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your subject details"
                : "Create a new subject to organize your lectures"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Biology 101, Mathematics"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add notes about this subject..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-slate-900 dark:border-slate-50"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={isSaving}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Subject?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Lectures in this subject will not be deleted, but will be unassigned from this subject.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
