"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Flashcard {
  id: string
  question: string
  answer: string
  difficulty_level: string
}

interface FlashcardViewerProps {
  flashcards: Flashcard[]
}

export function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [learningSet, setLearningSet] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
          No flashcards available yet. Generate study content from the transcript.
        </CardContent>
      </Card>
    )
  }

  const current = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleMarked = () => {
    setLearningSet((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(current.id)) {
        newSet.delete(current.id)
      } else {
        newSet.add(current.id)
      }
      return newSet
    })
  }

  const handleDownloadFlashcards = () => {
    const content = flashcards
      .map((card, idx) => `Q${idx + 1}: ${card.question}\nA${idx + 1}: ${card.answer}\n`)
      .join("\n")
    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "flashcards.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded",
      description: `${flashcards.length} flashcards downloaded`,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Flashcards</CardTitle>
            <CardDescription>
              Card {currentIndex + 1} of {flashcards.length}
            </CardDescription>
          </div>
          <Button onClick={handleDownloadFlashcards} size="sm" variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div
          className="min-h-64 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-8 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold text-blue-100 uppercase tracking-wide">
              {isFlipped ? "Answer" : "Question"}
            </p>
            <p className="text-2xl font-bold text-white text-balance">
              {isFlipped ? current.answer : current.question}
            </p>
            <p className="text-xs text-blue-100">Click to flip</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleMarked}
            variant={learningSet.has(current.id) ? "default" : "outline"}
            className="bg-transparent"
          >
            {learningSet.has(current.id) ? "✓ Marked for Review" : "Mark for Review"}
          </Button>
          <Button onClick={handlePrev} variant="outline" disabled={currentIndex === 0} className="bg-transparent">
            Previous
          </Button>
          <Button
            onClick={handleNext}
            variant="outline"
            disabled={currentIndex === flashcards.length - 1}
            className="bg-transparent"
          >
            Next
          </Button>
        </div>

        {learningSet.size > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Marked for review: {learningSet.size} card{learningSet.size !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
