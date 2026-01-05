"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExamQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
}

interface ExamQuestionsViewerProps {
  questions: ExamQuestion[]
}

export function ExamQuestionsViewer({ questions }: ExamQuestionsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string>>(new Map())
  const [showResults, setShowResults] = useState(false)
  const { toast } = useToast()

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-500 dark:text-slate-400">
          No exam questions available yet. Generate study content from the transcript.
        </CardContent>
      </Card>
    )
  }

  const current = questions[currentIndex]
  const options = [
    { key: "A", value: current.option_a },
    { key: "B", value: current.option_b },
    { key: "C", value: current.option_c },
    { key: "D", value: current.option_d },
  ]

  const handleSelectAnswer = (option: string) => {
    if (!showResults) {
      setSelectedAnswers((prev) => {
        const newMap = new Map(prev)
        newMap.set(current.id, option)
        return newMap
      })
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowResults(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowResults(false)
    }
  }

  const handleSubmit = () => {
    if (!selectedAnswers.has(current.id)) {
      toast({
        title: "Select an Answer",
        description: "Please select an answer before submitting",
        variant: "destructive",
      })
      return
    }
    setShowResults(true)
  }

  const isAnswerCorrect = selectedAnswers.get(current.id) === current.correct_answer
  const answered = selectedAnswers.has(current.id)

  const handleDownloadQuestions = () => {
    const content = questions
      .map((q, idx) => {
        const userAnswer = selectedAnswers.get(q.id) || "Not answered"
        const isCorrect = userAnswer === q.correct_answer
        return `Q${idx + 1}: ${q.question_text}\nA) ${q.option_a}\nB) ${q.option_b}\nC) ${q.option_c}\nD) ${q.option_d}\n\nCorrect Answer: ${q.correct_answer}\nYour Answer: ${userAnswer} ${isCorrect ? "(✓)" : "(✗)"}\n\nExplanation: ${q.explanation}\n\n`
      })
      .join("---\n")

    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "exam-questions.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded",
      description: `${questions.length} questions downloaded`,
    })
  }

  const correctCount = Array.from(selectedAnswers.entries()).filter(
    ([qId, answer]) => questions.find((q) => q.id === qId)?.correct_answer === answer,
  ).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Practice Exam</CardTitle>
            <CardDescription>
              Question {currentIndex + 1} of {questions.length}
            </CardDescription>
          </div>
          <Button onClick={handleDownloadQuestions} size="sm" variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {answered && (
          <div
            className={`p-4 rounded-lg ${isAnswerCorrect ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
          >
            <div className="flex items-start gap-3">
              {isAnswerCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-semibold ${isAnswerCorrect ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}
                >
                  {isAnswerCorrect ? "Correct!" : "Incorrect"}
                </p>
                <p
                  className={`text-sm mt-1 ${isAnswerCorrect ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}
                >
                  {current.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{current.question_text}</h3>
          </div>

          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => handleSelectAnswer(option.key)}
                disabled={showResults}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedAnswers.get(current.id) === option.key
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                } ${
                  showResults && option.key === current.correct_answer
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : ""
                } ${showResults && selectedAnswers.get(current.id) === option.key && option.key !== current.correct_answer ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}`}
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{option.key}</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{option.value}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!showResults ? (
            <Button onClick={handleSubmit} className="flex-1">
              Submit Answer
            </Button>
          ) : (
            <>
              <Button onClick={handlePrev} variant="outline" disabled={currentIndex === 0} className="bg-transparent">
                Previous
              </Button>
              <Button
                onClick={handleNext}
                variant="outline"
                disabled={currentIndex === questions.length - 1}
                className="bg-transparent"
              >
                Next
              </Button>
            </>
          )}
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          Progress: {correctCount} out of {answered ? selectedAnswers.size : 0} answered correctly
        </div>
      </CardContent>
    </Card>
  )
}
