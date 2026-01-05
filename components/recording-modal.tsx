"use client"

import { useEffect, useState, useRef } from "react"
import { LiveTranscription } from "@/components/live-transcription"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMediaRecorder } from "@/hooks/use-media-recorder"
import { Mic, Square, Play, Pause } from "lucide-react"

interface Subject {
  id: string
  name: string
  color: string
}

interface RecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: { title: string; description: string; transcript: string; audioBlob: Blob; subject_id?: string }) => Promise<void>
}

export function RecordingModal({ isOpen, onClose, onSave }: RecordingModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [transcript, setTranscript] = useState("")
  const [subjectId, setSubjectId] = useState<string>("")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const { toast } = useToast()
  const audioRef = useRef<Blob | null>(null)

  const {
    isRecording: mediaIsRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useMediaRecorder({
    onError: (error) => {
      toast({
        title: "Recording Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Fetch subjects when modal opens
  useEffect(() => {
    if (isOpen && subjects.length === 0) {
      fetchSubjects()
    }
  }, [isOpen, subjects.length])

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true)
      const response = await fetch("/api/subjects")
      if (response.ok) {
        const { data } = await response.json()
        setSubjects(data || [])
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
    } finally {
      setIsLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setTranscript("")
      setSubjectId("")
      setIsRecording(false)
      audioRef.current = null
    }
  }, [isOpen])

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleStartRecording = async () => {
    // Title is either from manual input OR from selected subject name
    const lectureTitle = title.trim() || (subjectId ? subjects.find(s => s.id === subjectId)?.name : "")
    
    if (!lectureTitle) {
      toast({
        title: "Missing Title",
        description: "Either select a subject or enter a custom title",
        variant: "destructive",
      })
      return
    }
    
    setTitle(lectureTitle) // Set the title if it wasn't set
    setIsRecording(true)
    await startRecording()
  }

  const handleStopRecording = async () => {
    try {
      const audioBlob = await stopRecording()
      audioRef.current = audioBlob
      setIsRecording(false)

      toast({
        title: "Recording Stopped",
        description: "Review your transcript and save when ready",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop recording",
        variant: "destructive",
      })
    }
  }

  const handlePauseResume = async () => {
    if (isPaused) {
      await resumeRecording()
      toast({ description: "Recording resumed" })
    } else {
      await pauseRecording()
      toast({ description: "Recording paused" })
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a lecture title",
        variant: "destructive",
      })
      return
    }

    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description: "Please record and transcribe a lecture first",
        variant: "destructive",
      })
      return
    }

    if (!audioRef.current) {
      toast({
        title: "No Audio",
        description: "No audio recording found",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Use custom description if provided, otherwise use subject description
      let finalDescription = description.trim()
      if (!finalDescription && subjectId) {
        const selectedSubject = subjects.find(s => s.id === subjectId)
        finalDescription = selectedSubject?.description || ""
      }

      await onSave?.({
        title: title.trim(),
        description: finalDescription,
        transcript,
        audioBlob: audioRef.current,
        subject_id: subjectId || undefined,
      })
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save lecture",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Lecture</DialogTitle>
          <DialogDescription>Record audio with real-time transcription</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* STEP 1: Before Recording - Simple subject selection */}
          {!isRecording && !transcript && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-4 block">🎓 Select Subject to Record</Label>
              </div>
              
              {subjects.length > 0 ? (
                <div className="grid gap-2">
                  <Select value={subjectId || "__none__"} onValueChange={(value) => setSubjectId(value === "__none__" ? "" : value)} disabled={isSaving || isLoadingSubjects}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">✕ Custom Title</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            {subject.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded">
                  No subjects created yet. <br/>Go to Dashboard → Manage Subjects to create one first.
                </div>
              )}

              {/* If Subject Selected - Show Title & Description from Database (Read-only) */}
              {subjectId && (
                <div className="space-y-3 bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-900">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subject Title</Label>
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {subjects.find(s => s.id === subjectId)?.name}
                    </div>
                  </div>
                  
                  {subjects.find(s => s.id === subjectId)?.description && (
                    <div className="grid gap-2 pt-2 border-t border-blue-200 dark:border-blue-900">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Subject Description</Label>
                      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {subjects.find(s => s.id === subjectId)?.description}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Title & Description - Only shown if "Custom Title" selected */}
              {!subjectId && (
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="modal-title">Lecture Title *</Label>
                    <Input
                      id="modal-title"
                      placeholder="e.g., Biology 101 - Cellular Respiration"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSaving}
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="modal-description">Description (Optional)</Label>
                    <Textarea
                      id="modal-description"
                      placeholder="Any additional notes about this lecture..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSaving}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={handleStartRecording} 
                disabled={isSaving || (!subjectId && !title.trim())} 
                className="w-full" 
                size="lg"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {/* STEP 2: During Recording - Focus on recording only */}
          {isRecording && (
            <div className="space-y-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <Label className="mb-3 block font-semibold">🎙️ Recording: {title}</Label>

              {/* Timer */}
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-red-500">{formatDuration(duration)}</div>
                <p className="text-slate-600 dark:text-slate-400">
                  {isPaused ? "Recording paused" : "Recording in progress..."}
                </p>
              </div>

              {/* Audio Level Meter */}
              <div className="space-y-2">
                <Label className="text-xs">Audio Level</Label>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                  <div className="flex items-end justify-center h-full gap-1 px-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all duration-100 ${
                          audioLevel / 12.75 > i ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                        style={{ height: `${20 + i * 4}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePauseResume} variant="outline" className="flex-1 bg-transparent">
                  {isPaused ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  )}
                </Button>
                <Button onClick={handleStopRecording} variant="destructive" className="flex-1">
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </Button>
              </div>

              {/* Live Transcription during recording */}
              <div className="border-t pt-4">
                <LiveTranscription
                  lectureId=""
                  isActive={isRecording}
                  isPaused={isPaused}
                  onTranscriptionUpdate={setTranscript}
                  showStartButton={false}
                />
              </div>
            </div>
          )}

          {/* STEP 3: After Recording - Review and save */}
          {!isRecording && transcript && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-3 block">✅ Review Transcript</Label>
              </div>

              <div className="grid gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <Label className="text-sm">Lecture: <span className="font-semibold text-blue-600 dark:text-blue-400">{title}</span></Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transcript-edit">Transcript</Label>
                <Textarea
                  id="transcript-edit"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={6}
                  disabled={isSaving}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTranscript("")
                    setIsRecording(false)
                  }}
                  disabled={isSaving}
                  className="bg-transparent"
                >
                  Record Again
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving ? "Saving..." : "Save Lecture"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving || isRecording} className="bg-transparent">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
