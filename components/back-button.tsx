"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function BackButton() {
  const router = useRouter()

  return (
    <Button variant="ghost" size="icon" onClick={() => router.back()}>
      <ArrowRight className="h-5 w-5" />
      <span className="sr-only">رجوع</span>
    </Button>
  )
} 