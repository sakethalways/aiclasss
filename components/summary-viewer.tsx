"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

function formatSummaryText(text: string) {
  // Remove markdown artifacts and format nicely
  let formatted = text
    .replace(/\*\*/g, '') // Remove ** markers
    .replace(/\*/g, '') // Remove * markers
    .replace(/^#+\s+/gm, '') // Remove heading markers
    .trim()
  
  // Split into paragraphs
  const paragraphs = formatted.split(/\n\n+/).filter(p => p.trim())
  
  return paragraphs.map((para, idx) => {
    // Check if it's a heading (short line followed by content)
    const isHeading = para.length < 60 && !para.includes('.') && paragraphs[idx + 1]?.length > para.length
    
    if (isHeading) {
      return (
        <h4 key={idx} className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2">
          {para}
        </h4>
      )
    }
    
    return (
      <p key={idx} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-3">
        {para}
      </p>
    )
  })
}

interface SummaryViewerProps {
  summary: string
  keyPoints: string[]
}

export function SummaryViewer({ summary, keyPoints }: SummaryViewerProps) {
  const { toast } = useToast()

  const handleDownloadSummary = () => {
    const content = `LECTURE SUMMARY\n\n${summary}\n\nKEY POINTS:\n${keyPoints.map((p) => `• ${p}`).join("\n")}`
    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = "lecture-summary.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)

    toast({
      title: "Downloaded",
      description: "Summary downloaded successfully",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Lecture Summary</CardTitle>
            <CardDescription>AI-generated overview of key concepts</CardDescription>
          </div>
          <Button onClick={handleDownloadSummary} size="sm" variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Summary</h3>
          <div className="space-y-2">{formatSummaryText(summary)}</div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Key Points</h3>
          <ul className="space-y-3">
            {keyPoints.map((point, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0 mt-[-2px]">•</span>
                <span className="leading-relaxed">{point.replace(/\*\*/g, '').replace(/\*/g, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
