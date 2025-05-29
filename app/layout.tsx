import type React from "react"
import "./globals.css"
import { Tajawal } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/error-boundary"
import { FocusResetter } from "@/components/focus-resetter"
import { ResetTheme } from "@/app/reset-theme"
import { StorageSetup } from "@/app/components/storage-setup"

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
})

export const metadata = {
  title: "راصد - نظام راصد التحفيزي",
  description: "نظام راصد التحفيزي لتعزيز تعلم الطلاب وتحفيزهم",
  generator: 'v0.dev',
  icons: {
    icon: '/rased-logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" className="h-full light" dir="rtl" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen font-tajawal antialiased",
        "bg-background",
        tajawal.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ResetTheme />
          <FocusResetter />
          <ErrorBoundary>
            <StorageSetup />
            {children}
          </ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
