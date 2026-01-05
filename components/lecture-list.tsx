"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Play, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Lecture {
  id: string
  title: string
  description: string | null
  duration_ms: number | null
  created_at: string
}

interface LectureListProps {
  lectures: Lecture[]
  isLoading?: boolean
  onDelete?: (id: string) => void
}

export function LectureList({ lectures, isLoading = false, onDelete }: LectureListProps) {
  const [lectureToDelete, setLectureToDelete] = useState<string | null>(null)

  const formatDuration = (ms: number | null) => {
    if (!ms) return "0:00"
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleDeleteConfirm = () => {
    if (lectureToDelete) {
      onDelete?.(lectureToDelete)
      setLectureToDelete(null)
    }
  }

  if (!lectures || lectures.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 space-y-4">
            <MessageCircle className="w-12 h-12 mx-auto text-slate-400" />
            <p className="text-slate-600 dark:text-slate-400">No lectures yet. Start recording your first lecture!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {lectures.map((lecture) => (
          <Card key={lecture.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{lecture.title}</CardTitle>
                  {lecture.description && (
                    <CardDescription className="line-clamp-2">{lecture.description}</CardDescription>
                  )}
                </div>
                {lecture.duration_ms && (
                  <div className="text-sm text-slate-500 whitespace-nowrap">{formatDuration(lecture.duration_ms)}</div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">{formatDate(lecture.created_at)}</p>
                <div className="flex gap-2">
                  <Link href={`/dashboard/lecture/${lecture.id}`}>
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setLectureToDelete(lecture.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={lectureToDelete !== null} onOpenChange={(open) => !open && setLectureToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lecture?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this lecture and all its data?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
