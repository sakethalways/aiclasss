"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SummaryViewer } from "@/components/summary-viewer"
import { FlashcardViewer } from "@/components/flashcard-viewer"
import { ExamQuestionsViewer } from "@/components/exam-questions-viewer"
import { NotesEditor } from "@/components/notes-editor"
import { LectureImages } from "@/components/lecture-images"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Download, Zap, Loader2 } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"

interface Lecture {
  id: string
  title: string
  description: string | null
  audio_url: string | null
  transcript: string | null
  created_at: string
}

interface Transcription {
  id: string
  raw_text: string
  timestamp_ms: number
  created_at: string
}

interface Summary {
  id: string
  summary_text: string
  key_points: string[]
}

interface Flashcard {
  id: string
  question: string
  answer: string
  difficulty_level: string
}

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

interface Note {
  id: string
  lecture_id: string
  content: string
  created_at: string
  updated_at: string
}

interface LectureImage {
  id: string
  lecture_id: string
  file_path: string
  uploaded_at: string
}

export default function LectureDetailPage() {
  const params = useParams()
  const lectureId = params.id as string
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [notes, setNotes] = useState<Note | null>(null)
  const [images, setImages] = useState<LectureImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [fullTranscript, setFullTranscript] = useState("")
  const [isEditingTranscript, setIsEditingTranscript] = useState(false)
  const [editedTranscript, setEditedTranscript] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/auth/login")
          return
        }

        const { data: lectureData, error: lectureError } = await supabase
          .from("lectures")
          .select("*")
          .eq("id", lectureId)
          .eq("user_id", user.id)
          .single()

        if (lectureError) throw lectureError
        setLecture(lectureData)

        const { data: transcriptionData, error: transcriptionError } = await supabase
          .from("transcriptions")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("timestamp_ms", { ascending: true })

        if (transcriptionError) throw transcriptionError
        setTranscriptions(transcriptionData || [])

        const combined = transcriptionData?.map((t) => t.raw_text).join(" ") || ""
        setFullTranscript(lectureData.transcript || combined)

        // Fetch latest summary deterministically
        const { data: summaryData, error: summaryError } = await supabase
          .from("summaries")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (summaryError?.message) {
          console.error("Error fetching summary:", summaryError)
        }
        if (summaryData) setSummary(summaryData)

        const { data: flashcardData } = await supabase
          .from("flashcards")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false })

        if (flashcardData) setFlashcards(flashcardData)

        const { data: questionData } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("lecture_id", lectureId)

        if (questionData) setExamQuestions(questionData)

        const { data: noteData } = await supabase
          .from("lecture_notes")
          .select("*")
          .eq("lecture_id", lectureId)
          .maybeSingle()

        if (noteData) setNotes(noteData)

        const { data: imageData } = await supabase
          .from("lecture_images")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("uploaded_at", { ascending: false })

        if (imageData) setImages(imageData)
      } catch (error) {
        console.error("Error fetching lecture:", error)
        toast({
          title: "Error",
          description: "Failed to load lecture details",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [lectureId, router, supabase, toast])

  const handleGenerateContent = useCallback(async () => {
    if (!fullTranscript.trim()) {
      toast({
        title: "No Transcript",
        description: "Transcription is still in progress. Try again in a moment.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          transcript: fullTranscript,
          title: lecture?.title,
          description: lecture?.description,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate content")
      }

      const result = await response.json()

      const hasExistingContent = summary || flashcards.length > 0 || examQuestions.length > 0
      
      toast({
        title: "Success",
        description: hasExistingContent 
          ? `Regenerated ${result.data.flashcardsCount} flashcards and ${result.data.questionsCount} exam questions` 
          : `Generated ${result.data.flashcardsCount} flashcards and ${result.data.questionsCount} exam questions`,
      })

      // Refetch all data from database after generation
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (user) {
        // Fetch latest summary deterministically
        const { data: summaryData, error: summaryError } = await supabase
          .from("summaries")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (summaryError?.message) {
          console.error("Error fetching summary:", summaryError)
        } else if (summaryData) {
          console.log("Updated summary with:", summaryData)
          setSummary(summaryData)
        }

        // Fetch flashcards
        const { data: flashcardData, error: flashcardError } = await supabase
          .from("flashcards")
          .select("*")
          .eq("lecture_id", lectureId)
          .order("created_at", { ascending: false })

        if (flashcardError) {
          console.error("Error fetching flashcards:", flashcardError)
        } else if (flashcardData) {
          console.log(`Updated flashcards: ${flashcardData.length} items`)
          setFlashcards(flashcardData)
        }

        // Fetch exam questions
        const { data: questionData, error: questionError } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("lecture_id", lectureId)

        if (questionError) {
          console.error("Error fetching exam questions:", questionError)
        } else if (questionData) {
          console.log(`Updated exam questions: ${questionData.length} items`)
          setExamQuestions(questionData)
        }
      }
    } catch (error) {
      console.error("Content generation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [fullTranscript, lectureId, lecture, supabase, toast])

  const handleDownloadTranscript = useCallback(() => {
    if (!fullTranscript) {
      toast({
        title: "No Transcript",
        description: "Transcription is still in progress",
        variant: "destructive",
      })
      return
    }

    const element = document.createElement("a")
    const file = new Blob([fullTranscript], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${lecture?.title || "lecture"}-transcript.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded",
      description: "Transcript downloaded successfully",
    })
  }, [fullTranscript, lecture, toast])

  const handleSaveTranscript = useCallback(async () => {
    try {
      const { error } = await supabase.from("lectures").update({ transcript: editedTranscript }).eq("id", lectureId)

      if (error) throw error

      setFullTranscript(editedTranscript)
      setIsEditingTranscript(false)

      toast({
        title: "Success",
        description: "Transcript updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save transcript",
        variant: "destructive",
      })
    }
  }, [editedTranscript, lectureId, supabase, toast])

  const handleNotesDelete = useCallback(() => {
    setNotes(null)
  }, [])

  const handleNotesSave = useCallback((savedNote: any) => {
    // Update the notes state with the saved note from the API
    if (savedNote && savedNote.id) {
      setNotes(savedNote)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">Loading lecture...</CardContent>
        </Card>
      </div>
    )
  }

  if (!lecture) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Lecture not found</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="mb-6 inline-block">
          <Button variant="outline" className="gap-2 bg-white dark:bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{lecture.title}</h1>
          {lecture.description && <p className="text-slate-600 dark:text-slate-400">{lecture.description}</p>}
        </div>

        <Tabs defaultValue="summary" className="w-full space-y-6">
          <TabsList className="grid grid-cols-6 bg-slate-200 dark:bg-slate-800">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="exam">Exam</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {summary ? (
              <>
                <SummaryViewer summary={summary.summary_text} keyPoints={summary.key_points || []} />
                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={handleGenerateContent} className="gap-2 w-full" disabled={isGenerating} variant="outline">
                      {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Zap className="w-4 h-4" />
                      Regenerate Summary with Updated Transcript
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    No summary generated yet. Generate AI content to get a summary.
                  </p>
                  <Button onClick={handleGenerateContent} className="gap-2" disabled={isGenerating}>
                    {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Zap className="w-4 h-4" />
                    Generate Summary
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-4">
            {flashcards.length > 0 ? (
              <>
                <FlashcardViewer flashcards={flashcards} />
                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={handleGenerateContent} className="gap-2 w-full" disabled={isGenerating} variant="outline">
                      {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Zap className="w-4 h-4" />
                      Regenerate Flashcards with Updated Transcript
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    No flashcards generated yet. Generate AI content to create study flashcards.
                  </p>
                  <Button onClick={handleGenerateContent} className="gap-2" disabled={isGenerating}>
                    {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Zap className="w-4 h-4" />
                    Generate Flashcards
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exam" className="space-y-4">
            {examQuestions.length > 0 ? (
              <>
                <ExamQuestionsViewer questions={examQuestions} />
                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={handleGenerateContent} className="gap-2 w-full" disabled={isGenerating} variant="outline">
                      {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Zap className="w-4 h-4" />
                      Regenerate Exam Questions with Updated Transcript
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    No exam questions generated yet. Generate AI content to create practice questions.
                  </p>
                  <Button onClick={handleGenerateContent} className="gap-2" disabled={isGenerating}>
                    {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Zap className="w-4 h-4" />
                    Generate Exam Questions
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Full Transcript</CardTitle>
                    <CardDescription>
                      {isEditingTranscript ? "Edit your transcript" : "Complete transcription of the lecture"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditingTranscript && (
                      <>
                        <Button
                          onClick={() => {
                            setEditedTranscript(fullTranscript)
                            setIsEditingTranscript(true)
                          }}
                          size="sm"
                          variant="outline"
                          className="gap-2 bg-white dark:bg-slate-800"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={handleDownloadTranscript}
                          size="sm"
                          variant="outline"
                          className="gap-2 bg-white dark:bg-slate-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditingTranscript ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedTranscript}
                      onChange={(e) => setEditedTranscript(e.target.value)}
                      rows={10}
                      placeholder="Edit your transcript..."
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTranscript} className="flex-1">
                        Save Transcript
                      </Button>
                      <Button
                        onClick={() => setIsEditingTranscript(false)}
                        variant="outline"
                        className="flex-1 bg-white dark:bg-slate-800"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                      {fullTranscript || "Transcription in progress..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <NotesEditor lectureId={lectureId} note={notes} onSave={handleNotesSave} onDelete={handleNotesDelete} />
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <LectureImages lectureId={lectureId} images={images} onImagesChange={setImages} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
