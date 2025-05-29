"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HomeButtonProps {
  href?: string
  className?: string
}

export function HomeButton({ href = "/", className }: HomeButtonProps) {
  return (
    <Link href={href}>
      <Button 
        variant="default" 
        size="sm"
        className={cn(
          "h-9 px-3 gap-2",
          className
        )}
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">العودة إلى الصفحة الرئيسية</span>
      </Button>
    </Link>
  )
} 