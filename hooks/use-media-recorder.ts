"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AudioProcessor } from "@/lib/audio-processor"

interface UseMediaRecorderOptions {
  onDataAvailable?: (chunk: Blob) => void
  onError?: (error: Error) => void
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<AudioProcessor | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const levelMonitorRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // We'll handle gain manually
        },
      })

      // Initialize audio processor for noise filtering
      const processor = new AudioProcessor()
      await processor.initialize(stream)
      processorRef.current = processor

      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && options.onDataAvailable) {
          options.onDataAvailable(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        if (options.onError) {
          options.onError(new Error(`Recording error: ${event.error}`))
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Collect data every second

      setIsRecording(true)
      setDuration(0)

      // Timer for duration
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)

      // Monitor audio levels for visualization
      levelMonitorRef.current = setInterval(() => {
        if (processor) {
          const level = processor.getAverageFrequency()
          setAudioLevel(level)
        }
      }, 100)
    } catch (error) {
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error("Failed to start recording"))
      }
    }
  }, [options])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) clearInterval(timerRef.current)
      if (levelMonitorRef.current) clearInterval(levelMonitorRef.current)
    }
  }, [isRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
      levelMonitorRef.current = setInterval(() => {
        if (processorRef.current) {
          const level = processorRef.current.getAverageFrequency()
          setAudioLevel(level)
        }
      }, 100)
    }
  }, [isPaused])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (mediaRecorderRef.current && isRecording) {
        const chunks: Blob[] = []

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" })
          resolve(blob)
        }

        mediaRecorderRef.current.stop()

        // Stop all streams and cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }

        if (processorRef.current) {
          processorRef.current.stop()
        }

        if (timerRef.current) clearInterval(timerRef.current)
        if (levelMonitorRef.current) clearInterval(levelMonitorRef.current)

        setIsRecording(false)
        setIsPaused(false)
        setDuration(0)
        setAudioLevel(0)
      } else {
        reject(new Error("No active recording"))
      }
    })
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (levelMonitorRef.current) clearInterval(levelMonitorRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      // Only stop processor if it exists and hasn't been stopped already
      if (processorRef.current) {
        processorRef.current.stop()
        processorRef.current = null
      }
    }
  }, [])

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  }
}
