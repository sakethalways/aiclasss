"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { TranscriptionService } from "@/lib/transcription-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface LiveTranscriptionProps {
  lectureId: string
  isActive: boolean
  isPaused?: boolean
  onTranscriptionUpdate?: (transcript: string) => void
  showStartButton?: boolean
}

export function LiveTranscription({
  lectureId,
  isActive,
  isPaused = false,
  onTranscriptionUpdate,
  showStartButton = false,
}: LiveTranscriptionProps) {
  const [finalTranscript, setFinalTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null)
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!transcriptionServiceRef.current) {
      transcriptionServiceRef.current = new TranscriptionService()

      if (!transcriptionServiceRef.current.isSupported()) {
        setError("Speech Recognition API is not supported in your browser")
        toast({
          title: "Browser Not Supported",
          description: "Your browser does not support real-time transcription. Use Chrome, Firefox, or Edge.",
          variant: "destructive",
        })
      }
    }
  }, [toast])

  const startTranscription = useCallback(() => {
    if (!transcriptionServiceRef.current) return

    setIsTranscribing(true)
    setError(null)

    transcriptionServiceRef.current.start(
      (interim, final) => {
        setFinalTranscript(final)
        setInterimTranscript(interim)
        onTranscriptionUpdate?.(final + interim)

        if (final && final.length > 50) {
          abortControllerRef.current = new AbortController()

          fetch("/api/transcriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lectureId,
              rawText: final,
              timestampMs: Date.now(),
            }),
            signal: abortControllerRef.current.signal,
          }).catch((err) => {
            if (err.name !== "AbortError") {
              console.error("[v0] Failed to save transcription:", err)
            }
          })
        }
      },
      (error) => {
        setError(error)
        setIsTranscribing(false)
      },
    )
  }, [lectureId, onTranscriptionUpdate])

  const stopTranscription = useCallback(() => {
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.stop()
      setIsTranscribing(false)

      if (finalTranscript.trim()) {
        const wordCount = finalTranscript.split(/\s+/).filter((w) => w).length
        toast({
          title: "Transcription Stopped",
          description: `Transcription completed with ${wordCount} words.`,
          variant: "default",
        })
      }
    }
  }, [finalTranscript, toast])

  useEffect(() => {
    if (isActive && !isTranscribing && !showStartButton) {
      const timer = setTimeout(() => {
        startTranscription()
      }, 100)
      return () => clearTimeout(timer)
    } else if (!isActive && isTranscribing && !showStartButton) {
      const timer = setTimeout(() => {
        stopTranscription()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isActive, isTranscribing, startTranscription, stopTranscription, showStartButton])

  // Handle pause/resume for the transcription service
  useEffect(() => {
    if (!transcriptionServiceRef.current || !isTranscribing) return

    if (isPaused) {
      console.log("[LiveTranscription] Pausing transcription")
      transcriptionServiceRef.current.pause()
    } else {
      console.log("[LiveTranscription] Resuming transcription")
      transcriptionServiceRef.current.resume()
    }
  }, [isPaused, isTranscribing])

  useEffect(() => {
    return () => {
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.abort()
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transcription</CardTitle>
        <CardDescription>
          {isTranscribing ? "Listening... Speak clearly for best results" : "Ready to transcribe"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 p-3 rounded">{error}</div>}

        <ScrollArea className="h-64 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
          <div className="space-y-2">
            {finalTranscript && (
              <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed">{finalTranscript}</p>
            )}
            {interimTranscript && (
              <p className="text-slate-600 dark:text-slate-400 text-sm italic">{interimTranscript}</p>
            )}
            {!finalTranscript && !interimTranscript && (
              <p className="text-slate-400 dark:text-slate-600 text-sm">Start speaking to see transcription here...</p>
            )}
          </div>
        </ScrollArea>

        {showStartButton && (
          <div className="flex gap-2">
            {!isTranscribing ? (
              <Button onClick={startTranscription} className="flex-1">
                Start Transcription
              </Button>
            ) : (
              <Button onClick={stopTranscription} variant="destructive" className="flex-1">
                Stop Transcription
              </Button>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p>Words: {finalTranscript.split(/\s+/).filter((w) => w).length}</p>
        </div>
      </CardContent>
    </Card>
  )
}
