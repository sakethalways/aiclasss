"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LectureList } from "@/components/lecture-list"
import { SubjectsManager } from "@/components/subjects-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { LogOut, BookOpen, X } from "lucide-react"
import { RecordingModal } from "@/components/recording-modal"

interface Lecture {
  id: string
  title: string
  description: string | null
  duration_ms: number | null
  created_at: string
  transcript: string | null
}

export default function DashboardPage() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [displayName, setDisplayName] = useState("")
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("lectures")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  // Filter lectures based on search query and date
  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch =
      lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecture.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDate = !filterDate || lecture.created_at.split("T")[0] === filterDate

    return matchesSearch && matchesDate
  })

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

        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

        if (profile) {
          setDisplayName(profile.display_name || "Student")
        }

        const { data, error } = await supabase
          .from("lectures")
          .select("id, title, description, duration_ms, created_at, transcript")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setLectures(data || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load your lectures",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router, supabase, toast])

  const handleRecordingComplete = useCallback(
    async (recordingData: { title: string; description: string; transcript: string; audioBlob: Blob; subject_id?: string }) => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/lectures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: recordingData.title,
            description: recordingData.description,
            transcript: recordingData.transcript,
            subject_id: recordingData.subject_id || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to save lecture")
        }

        const lecture = await response.json()

        setLectures((prev) => [lecture as Lecture, ...prev])

        toast({
          title: "Success",
          description: "Lecture saved! You can now generate study materials.",
        })

        setIsRecordingModalOpen(false)
      } catch (error) {
        console.error("Error saving lecture:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to save lecture",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [toast],
  )

  const handleDeleteLecture = useCallback(
    async (lectureId: string) => {
      try {
        const { error } = await supabase.from("lectures").delete().eq("id", lectureId)

        if (error) throw error

        setLectures((prev) => prev.filter((l) => l.id !== lectureId))
        toast({
          title: "Success",
          description: "Lecture deleted",
        })
      } catch (error) {
        console.error("Error deleting lecture:", error)
        toast({
          title: "Error",
          description: "Failed to delete lecture",
          variant: "destructive",
        })
      }
    },
    [supabase, toast],
  )

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">Loading your dashboard...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">LectureLens</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Welcome back, {displayName}!</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2 bg-white dark:bg-slate-800">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        {/* Start Recording Button */}
        <div className="mb-8">
          <Button
            onClick={() => setIsRecordingModalOpen(true)}
            size="lg"
            className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <BookOpen className="w-5 h-5" />
            Start Recording
          </Button>
        </div>

        {/* Lectures Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lectures">Your Lectures</TabsTrigger>
            <TabsTrigger value="subjects">Manage Subjects</TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Your Lectures</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {filteredLectures.length} of {lectures.length} lecture{lectures.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(searchQuery || filterDate) && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setFilterDate("")
                  }}
                  className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <LectureList lectures={filteredLectures} isLoading={isLoading} onDelete={handleDeleteLecture} />
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <SubjectsManager />
          </TabsContent>
        </Tabs>

        <RecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => setIsRecordingModalOpen(false)}
          onSave={handleRecordingComplete}
        />
      </div>
    </main>
  )
}
