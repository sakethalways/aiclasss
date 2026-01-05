"use client"
import { useState } from "react"
import { useMediaRecorder } from "@/hooks/use-media-recorder"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface LectureRecorderProps {
  onRecordingComplete?: (data: { title: string; description: string; audioBlob: Blob }) => void
  isLoading?: boolean
}

export function LectureRecorder({ onRecordingComplete, isLoading = false }: LectureRecorderProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [recordingStarted, setRecordingStarted] = useState(false)
  const { toast } = useToast()

  const {
    isRecording,
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

  const handleStart = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a lecture title",
        variant: "destructive",
      })
      return
    }

    setRecordingStarted(true)
    await startRecording()
  }

  const handleStop = async () => {
    try {
      const audioBlob = await stopRecording()
      setRecordingStarted(false)

      if (onRecordingComplete) {
        onRecordingComplete({
          title,
          description,
          audioBlob,
        })
      }

      toast({
        title: "Recording Complete",
        description: "Your lecture has been recorded successfully",
      })

      setTitle("")
      setDescription("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop recording",
        variant: "destructive",
      })
    }
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Record a Lecture</CardTitle>
        <CardDescription>Record, transcribe, and generate study materials automatically</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!recordingStarted ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Lecture Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Biology 101 - Cellular Respiration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isRecording || isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any notes about this lecture..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isRecording || isLoading}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Tip:</span> We use advanced noise filtering and echo cancellation. Speak
                clearly and position your device away from background noise for best results.
              </p>
            </div>

            <Button onClick={handleStart} disabled={isRecording || isLoading} className="w-full">
              Start Recording
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-5xl font-bold text-red-500">{formatDuration(duration)}</div>
              <p className="text-slate-600 dark:text-slate-400">Recording in progress...</p>
            </div>

            <div className="space-y-2">
              <Label>Audio Level</Label>
              <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
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
              {!isPaused && (
                <Button onClick={pauseRecording} variant="outline" className="flex-1 bg-transparent">
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button onClick={resumeRecording} variant="outline" className="flex-1 bg-transparent">
                  Resume
                </Button>
              )}
              <Button onClick={handleStop} variant="destructive" className="flex-1" disabled={isLoading}>
                {isLoading ? "Processing..." : "Stop"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
