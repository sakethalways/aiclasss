"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        router.push("/dashboard")
      } else {
        setIsAuthenticated(false)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-50">LectureLens</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">Your Smart Campus Assistant</p>
          </div>

          <div className="prose dark:prose-invert max-w-2xl mx-auto">
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              Never fall behind in class again. Record lectures, get real-time transcriptions, and AI-powered study
              materials all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 my-12">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>🎙️ Record Lectures</CardTitle>
                <CardDescription>Capture every word with advanced noise filtering</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>📝 Real-Time Transcription</CardTitle>
                <CardDescription>Instant text transcription with Google Cloud Speech-to-Text</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>✨ AI Summaries</CardTitle>
                <CardDescription>Get concise summaries powered by Gemini AI</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>📚 Study Materials</CardTitle>
                <CardDescription>Auto-generated flashcards and exam questions</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="flex gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="px-8 bg-transparent">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
