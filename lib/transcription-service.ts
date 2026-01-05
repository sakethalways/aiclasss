// Real-time transcription service with multi-language support
// Automatically detects language and transcribes in real-time

export class TranscriptionService {
  private recognition: any = null
  private isListening = false
  private isAborting = false
  private shouldBeListening = false
  private isPausedState = false
  private transcript = ""
  private interimTranscript = ""
  private silenceTimer: NodeJS.Timeout | null = null
  private restartTimer: NodeJS.Timeout | null = null
  private lastResultTime = 0
  private currentLanguage = "en-US"
  private onResultCallback: ((interim: string, final: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private restartAttempts = 0
  private maxRestartAttempts = 3

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition()
      this.setupRecognition()
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = this.currentLanguage
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      console.log("[TranscriptionService] Recognition started")
      this.isListening = true
      this.isAborting = false
      this.restartAttempts = 0
      this.clearSilenceTimer()
      this.clearRestartTimer()
    }

    this.recognition.onend = () => {
      console.log("[TranscriptionService] Recognition ended, shouldBeListening:", this.shouldBeListening, "isPausedState:", this.isPausedState)
      this.isListening = false
      
      // Auto-restart if we should still be listening and not paused
      if (this.shouldBeListening && !this.isAborting && !this.isPausedState) {
        console.log("[TranscriptionService] Auto-restarting recognition...")
        this.restartTimer = setTimeout(() => {
          this.attemptRestart()
        }, 100)
      }
    }

    this.recognition.onerror = (event: any) => {
      console.log("[TranscriptionService] Recognition error:", event.error)

      // Handle different error types
      if (event.error === 'no-speech') {
        console.log("[TranscriptionService] No speech detected, will auto-restart")
        // Let onend handler restart it
      } else if (event.error === 'audio-capture') {
        this.onErrorCallback?.("Microphone access denied or unavailable")
        this.shouldBeListening = false
      } else if (event.error === 'not-allowed') {
        this.onErrorCallback?.("Microphone permission denied")
        this.shouldBeListening = false
      } else if (event.error === 'network') {
        console.log("[TranscriptionService] Network error, will retry")
        // Let onend handler restart it
      } else if (event.error === 'aborted') {
        if (!this.isAborting) {
          console.log("[TranscriptionService] Unexpected abort, will restart if needed")
        }
      }
    }
  }

  private attemptRestart() {
    if (!this.shouldBeListening || this.isAborting || this.isListening) {
      return
    }

    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error("[TranscriptionService] Max restart attempts reached")
      this.restartAttempts = 0
      // Wait a bit longer before resetting attempts
      this.restartTimer = setTimeout(() => {
        this.restartAttempts = 0
        if (this.shouldBeListening) {
          this.attemptRestart()
        }
      }, 2000)
      return
    }

    try {
      console.log(`[TranscriptionService] Restart attempt ${this.restartAttempts + 1}/${this.maxRestartAttempts}`)
      this.restartAttempts++
      this.recognition.start()
    } catch (error) {
      console.error("[TranscriptionService] Failed to restart:", error)
      if (error instanceof Error && error.message.includes("already started")) {
        // Recognition is already running, reset state
        this.isListening = true
        this.restartAttempts = 0
      } else {
        // Retry after a short delay
        this.restartTimer = setTimeout(() => {
          this.attemptRestart()
        }, 500)
      }
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  private clearRestartTimer() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  setLanguage(language: string) {
    this.currentLanguage = language
    if (this.recognition) {
      this.recognition.lang = language
    }
  }

  start(onResult: (interim: string, final: string) => void, onError?: (error: string) => void): void {
    if (!this.recognition) {
      onError?.("Speech Recognition API not supported")
      return
    }

    if (this.shouldBeListening) {
      console.log("[TranscriptionService] Already running")
      return
    }

    this.transcript = ""
    this.interimTranscript = ""
    this.isAborting = false
    this.shouldBeListening = true
    this.lastResultTime = Date.now()
    this.onResultCallback = onResult
    this.onErrorCallback = onError
    this.restartAttempts = 0

    this.recognition.onresult = (event: any) => {
      this.lastResultTime = Date.now()
      this.clearSilenceTimer()
      this.interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          this.transcript += transcript + " "
        } else {
          this.interimTranscript += transcript
        }
      }

      this.onResultCallback?.(this.interimTranscript, this.transcript)
    }

    try {
      this.recognition.start()
    } catch (error) {
      if (error instanceof Error && !error.message.includes("already started")) {
        console.error("[TranscriptionService] Failed to start transcription:", error)
        onError?.(error.message || "Failed to start transcription")
        this.shouldBeListening = false
      }
    }
  }

  stop(): string {
    console.log("[TranscriptionService] Stopping transcription")
    this.shouldBeListening = false
    this.clearSilenceTimer()
    this.clearRestartTimer()
    
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error("[TranscriptionService] Error stopping transcription:", error)
      }
    }
    
    this.onResultCallback = null
    this.onErrorCallback = null
    return this.transcript
  }

  abort(): void {
    console.log("[TranscriptionService] Aborting transcription")
    this.shouldBeListening = false
    this.clearSilenceTimer()
    this.clearRestartTimer()
    
    if (this.recognition && (this.isListening || this.isAborting)) {
      this.isAborting = true
      try {
        this.recognition.abort()
        this.isListening = false
      } catch (error) {
        console.error("[TranscriptionService] Error aborting transcription:", error)
      } finally {
        this.isAborting = false
      }
    }
    
    this.onResultCallback = null
    this.onErrorCallback = null
  }

  pause(): void {
    console.log("[TranscriptionService] Pausing transcription")
    this.isPausedState = true
    this.clearSilenceTimer()
    
    // Stop listening but don't abort - we want to resume
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
        // Don't set isListening to false here - let onend handle it
      } catch (error) {
        console.error("[TranscriptionService] Error pausing transcription:", error)
      }
    }
  }

  resume(): void {
    console.log("[TranscriptionService] Resuming transcription")
    this.isPausedState = false
    
    // Restart transcription
    if (this.shouldBeListening && !this.isListening && this.recognition) {
      try {
        this.recognition.start()
      } catch (error) {
        if (error instanceof Error && !error.message.includes("already started")) {
          console.error("[TranscriptionService] Error resuming transcription:", error)
        }
      }
    }
  }

  isSupported(): boolean {
    return !!this.recognition
  }

  getLanguage(): string {
    return this.currentLanguage
  }
}
