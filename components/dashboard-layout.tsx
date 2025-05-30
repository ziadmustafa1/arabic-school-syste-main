"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import FallbackPage from "@/app/fallback-page"
import { AppLogo } from "@/components/app-logo"
import { cn } from "@/lib/utils"
import { ROLE_NAMES } from "@/lib/constants"
import { Sidebar } from "@/components/sidebar"
import { Menu, X, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { usePathname } from "next/navigation"
import { BackButton } from "./back-button"
import { HomeButton } from "./home-button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Fallback data in case of errors
const FALLBACK_DATA = {
  user: { role_id: 1, full_name: "Guest User" },
  notifications: { count: 0 },
  messages: { count: 0 }
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

export function DashboardLayout({ children, userRole = "3" }: DashboardLayoutProps) {
  // State for loading and data
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState({
    role: 1,
    name: "",
    initials: "",
    notifications: 0,
    messages: 0
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const supabase = createClient()
  const pathname = usePathname()
  
  // Check if current page is a dashboard home page
  const isDashboardHome = pathname === "/" || 
                         pathname === "/admin" || 
                         pathname === "/teacher" || 
                         pathname === "/student" || 
                         pathname === "/parent"
  
  // Load data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // Get current user session
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (!sessionData.session) {
          setError("يجب تسجيل الدخول أولاً")
          applyFallbackData()
          return
        }
        
        // Get user data
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()
        
        if (userError || !userData) {
          console.error("Error fetching user data:", userError)
          setError("خطأ في الحصول على بيانات المستخدم")
          applyFallbackData()
          return
        }
        
        // Get notifications count
        const { count: notificationsCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sessionData.session.user.id)
          .eq("is_read", false)
        
        // Get messages count
        const { count: messagesCount } = await supabase
          .from("user_messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", sessionData.session.user.id)
          .eq("is_read", false)
        
        // Generate initials
        const nameParts = userData.full_name.split(" ")
        const initials = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : userData.full_name.substring(0, 2)
          
        setUserData({
          role: userData.role_id,
          name: userData.full_name,
          initials: initials.toUpperCase(),
          notifications: notificationsCount || 0,
          messages: messagesCount || 0
        })
      } catch (err) {
        console.error("Error loading dashboard:", err)
        setError("An unexpected error occurred")
        applyFallbackData()
      } finally {
        // Always set loading to false when done
        setIsLoading(false)
      }
    }
    
    const applyFallbackData = () => {
      const nameParts = FALLBACK_DATA.user.full_name.split(" ")
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
        : FALLBACK_DATA.user.full_name.substring(0, 2)
        
      setUserData({
        role: FALLBACK_DATA.user.role_id,
        name: FALLBACK_DATA.user.full_name,
        initials: initials.toUpperCase(),
        notifications: FALLBACK_DATA.notifications.count,
        messages: FALLBACK_DATA.messages.count
      })
    }
    
    // Close sidebar on mobile when route changes
    const handleRouteChange = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }

    // Close sidebar on mobile when window resizes
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state based on window size
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 1024)
      window.addEventListener('resize', handleResize)
    }
    
    // Load the data
    loadDashboardData()
    
    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [supabase])
  
  if (isLoading) {
    return <FallbackPage loading={true} />
  }
  
  if (error) {
    return <FallbackPage error={error} />
  }
  
  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen flex-row-reverse">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-64 lg:w-72 bg-background transition-transform duration-300 ease-in-out",
            !sidebarOpen && "translate-x-full lg:translate-x-0"
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col min-h-screen",
          "lg:mr-72", // Fixed margin for sidebar on desktop
        )}>
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-background">
            <div className="container flex h-16 items-center px-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
                <span className="sr-only">Toggle Menu</span>
              </Button>

              <div className="flex items-center gap-3 flex-1">
                <AppLogo />
                {!isDashboardHome && <BackButton />}
                {!isDashboardHome && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HomeButton
                        href={
                          userData.role === 1
                            ? "/student"
                            : userData.role === 2
                            ? "/parent"
                            : userData.role === 3
                            ? "/teacher"
                            : "/admin"
                        }
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">العودة إلى الصفحة الرئيسية</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm">
                  <span className="font-semibold">{userData.name}</span>
                  <span className="text-muted-foreground hidden sm:inline mr-2">
                    {ROLE_NAMES[userData.role]}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1">
            <div className="container py-6">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/80 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </TooltipProvider>
  )
}