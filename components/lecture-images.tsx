"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Upload, Trash2, Download, Loader2, Eye, ChevronLeft, ChevronRight, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LectureImage {
  id: string
  lecture_id: string
  file_path: string
  uploaded_at: string
}

interface LectureImagesProps {
  lectureId: string
  images: LectureImage[]
  onImagesChange?: (images: LectureImage[]) => void
}

export function LectureImages({ lectureId, images, onImagesChange }: LectureImagesProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null)
  const { toast } = useToast()

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files
      if (!files || files.length === 0) return

      const totalImages = images.length + files.length
      if (totalImages > 5) {
        toast({
          title: "Limit Reached",
          description: `Cannot upload ${files.length} images. Maximum 5 images total (you have ${images.length})`,
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)
      try {
        const uploadedImages: LectureImage[] = []

        for (const file of Array.from(files)) {
          const formData = new FormData()
          formData.append("file", file)
          formData.append("lectureId", lectureId)

          const response = await fetch("/api/lecture-images", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) throw new Error("Failed to upload image")

          const result = await response.json()
          uploadedImages.push(result.data)
        }

        const allImages = [...images, ...uploadedImages]
        onImagesChange?.(allImages)

        toast({
          title: "Success",
          description: `${uploadedImages.length} image(s) uploaded successfully`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [images, lectureId, onImagesChange, toast],
  )

  const handleDeleteImage = useCallback(async () => {
    if (!selectedImageId) return

    try {
      const response = await fetch("/api/lecture-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: selectedImageId, lectureId }),
      })

      if (!response.ok) throw new Error("Failed to delete image")

      onImagesChange?.(images.filter((img) => img.id !== selectedImageId))

      toast({
        title: "Success",
        description: "Image deleted successfully",
      })

      setShowDeleteConfirm(false)
      setSelectedImageId(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }, [selectedImageId, lectureId, images, onImagesChange, toast])

  const handleDownloadImage = (filePath: string, fileName?: string) => {
    const link = document.createElement("a")
    link.href = filePath
    link.download = fileName || filePath.split("/").pop() || "image"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Downloaded",
      description: "Image downloaded successfully",
    })
  }

  const viewingImage = viewingImageIndex !== null ? images[viewingImageIndex] : null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Lecture Images</CardTitle>
              <CardDescription>Add images to your lecture notes (Max 5 images)</CardDescription>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{images.length}/5</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading || images.length >= 5}
              className="hidden"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={isUploading || images.length >= 5}
                asChild
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Image
                    </>
                  )}
                </span>
              </Button>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {images.length >= 5 ? "Maximum images reached" : "Click to upload or drag images"}
            </p>
          </div>

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.file_path || "/placeholder.svg"}
                    alt="Lecture"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-transparent"
                      onClick={() => setViewingImageIndex(index)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-transparent"
                      onClick={() => handleDownloadImage(image.file_path)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:bg-transparent"
                      onClick={() => {
                        setSelectedImageId(image.id)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="relative max-w-2xl max-h-[80vh] flex flex-col">
            <img
              src={viewingImage.file_path || "/placeholder.svg"}
              alt="Lecture"
              className="max-w-2xl max-h-[80vh] object-contain rounded-lg"
            />
            <div className="flex items-center justify-between mt-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-900 text-white border-0 hover:bg-slate-800"
                onClick={() =>
                  setViewingImageIndex(viewingImageIndex! > 0 ? viewingImageIndex! - 1 : images.length - 1)
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm">
                {viewingImageIndex! + 1} / {images.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-900 text-white border-0 hover:bg-slate-800"
                onClick={() =>
                  setViewingImageIndex(viewingImageIndex! < images.length - 1 ? viewingImageIndex! + 1 : 0)
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-slate-900 text-white border-0 hover:bg-slate-800 ml-auto"
                onClick={() => setViewingImageIndex(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
