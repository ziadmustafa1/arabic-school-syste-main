"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Camera, Loader2, User, Medal, Trophy, Crown, BadgeAlert, Award } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { toast } from "@/components/ui/use-toast"
import { getUserBadges } from "@/app/actions/badges"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { showSuccessToast, showErrorToast, showActionSuccessToast, showActionErrorToast } from "@/lib/utils/toast-messages"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { getUserMedals } from "@/app/actions/medals"
import { getUserTierInfo } from "@/lib/actions/tiers"

interface UserBadge {
  id: number
  name: string
  description: string | null
  image_url: string | null
  points_threshold: number
  badge_type: string
  awarded_at: string
}

// Add interface for medals
interface UserMedal {
  id: number
  name: string
  description?: string | null
  image_url?: string | null
  awarded_at: string
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [userLevel, setUserLevel] = useState({ level: 0, nextLevel: 0, progress: 0 })
  const [userTier, setUserTier] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [userMedals, setUserMedals] = useState<UserMedal[]>([])
  // Add state for validation errors
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        
        // Get current user session
        const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser()
        
        if (sessionError || !currentUser) {
          console.error("Authentication error:", sessionError)
          router.push('/auth/login')
          return
        }
        
        setUser(currentUser)
        
        // Fetch user tier information
        try {
          const tierResult = await getUserTierInfo(currentUser.id)
          if (tierResult.success && tierResult.data) {
            console.log("User tier data:", tierResult.data)
            setUserTier(tierResult.data)
          }
        } catch (tierError) {
          console.error("Error fetching tier information:", tierError)
        }
        
        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", currentUser.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
          toast({
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة تحميل بيانات الملف الشخصي",
            variant: "destructive",
          })
        }
        
        if (profile) {
          setFormData({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
          })
        }
        
        // Get user points
        const { data: pointsData, error: pointsError } = await supabase
          .rpc("get_user_points_balance", {
            user_id_param: currentUser.id
          })
          
        if (pointsError) {
          console.error("Error fetching points:", pointsError)
        } else {
          setUserPoints(pointsData || 0)
          
          // Calculate user level
          calculateUserLevel(pointsData || 0)
        }
        
        // Get user badges
        const badgesResult = await getUserBadges(currentUser.id)
        if (badgesResult.success) {
          setUserBadges(badgesResult.data)
        } else {
          console.error("Error fetching badges:", badgesResult.message)
        }

        // Add this to fetch medals
        if (currentUser && currentUser.id) {
          // Fetch user medals
          const userMedalsResult = await getUserMedals(currentUser.id)
          if (userMedalsResult.success) {
            setUserMedals(userMedalsResult.data)
          }
        }
      } catch (err) {
        console.error("Profile loading error:", err)
        toast({
          title: "خطأ في تحميل البيانات",
          description: "حدث خطأ أثناء محاولة تحميل بيانات الملف الشخصي",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, supabase])
  
  // Calculate user level based on points
  const calculateUserLevel = (points: number) => {
    // Level thresholds - can be adjusted as needed
    const levelThresholds = [
      { level: 1, points: 0 },
      { level: 2, points: 100 },
      { level: 3, points: 250 },
      { level: 4, points: 500 },
      { level: 5, points: 1000 },
      { level: 6, points: 2000 },
      { level: 7, points: 3500 },
      { level: 8, points: 5000 },
      { level: 9, points: 7500 },
      { level: 10, points: 10000 }
    ]
    
    // Find current level
    const currentLevelData = levelThresholds.reduce((prev, curr) => {
      return (points >= curr.points) ? curr : prev
    }, levelThresholds[0])
    
    // Find next level
    const nextLevelIndex = levelThresholds.findIndex(l => l.level === currentLevelData.level) + 1
    const nextLevelData = nextLevelIndex < levelThresholds.length 
      ? levelThresholds[nextLevelIndex] 
      : { level: currentLevelData.level + 1, points: currentLevelData.points * 1.5 }
    
    // Calculate progress to next level
    const pointsForCurrentLevel = currentLevelData.points
    const pointsForNextLevel = nextLevelData.points
    const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel
    const pointsGained = points - pointsForCurrentLevel
    const progress = Math.min(Math.floor((pointsGained / pointsNeeded) * 100), 100)
    
    setUserLevel({
      level: currentLevelData.level,
      nextLevel: nextLevelData.level,
      progress
    })
  }

  const handleProfileUpdate = async () => {
    setUpdating(true)
    try {
      if (!user) return
      
      const { error } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      setSuccess("تم تحديث الملف الشخصي بنجاح")
      setShowProfileDialog(false)
    } catch (err: any) {
      console.error("Error updating profile:", err)
      setError("حدث خطأ أثناء تحديث الملف الشخصي")
      showErrorToast(
        "خطأ في تحديث الملف الشخصي",
        err.message || "حدث خطأ أثناء تحديث الملف الشخصي"
      )
    } finally {
      setUpdating(false)
    }
  }

  const handlePasswordChange = async () => {
    setUpdating(true)
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("كلمات المرور غير متطابقة")
        showErrorToast(
          "خطأ في تحديث كلمة المرور",
          "كلمات المرور غير متطابقة"
        )
        setUpdating(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      showActionSuccessToast(
        "تحديث كلمة المرور",
        "تم تحديث كلمة المرور بنجاح"
      )
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setShowPasswordDialog(false)
    } catch (err: any) {
      console.error("Error updating password:", err)
      setError("حدث خطأ أثناء تحديث كلمة المرور")
      showErrorToast(
        "خطأ في تحديث كلمة المرور",
        err.message || "حدث خطأ أثناء تحديث كلمة المرور"
      )
    } finally {
      setUpdating(false)
    }
  }

  const getLevelIcon = () => {
    const level = userLevel.level
    if (level >= 8) return <Crown className="h-8 w-8 text-amber-500" />
    if (level >= 6) return <Trophy className="h-8 w-8 text-amber-600" />
    if (level >= 3) return <Medal className="h-8 w-8 text-slate-400" />
    return <Medal className="h-8 w-8 text-primary" />
  }

  const initiateProfileUpdate = () => {
    validateProfileForm()
    if (Object.keys(profileErrors).length === 0) {
      setShowProfileDialog(true)
    }
  }

  const initiatePasswordUpdate = () => {
    validatePasswordForm()
    if (Object.keys(passwordErrors).length === 0) {
      setShowPasswordDialog(true)
    }
  }

  // Add validation functions
  const validateProfileForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.full_name.trim()) {
      errors.full_name = "الاسم الكامل مطلوب"
    }
    
    setProfileErrors(errors)
  }
  
  const validatePasswordForm = () => {
    const errors: Record<string, string> = {}
    
    if (!passwordData.currentPassword.trim()) {
      errors.currentPassword = "كلمة المرور الحالية مطلوبة"
    }
    
    if (!passwordData.newPassword.trim()) {
      errors.newPassword = "كلمة المرور الجديدة مطلوبة"
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "كلمة المرور يجب أن تكون على الأقل 6 أحرف"
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "كلمات المرور غير متطابقة"
    }
    
    setPasswordErrors(errors)
  }

  // Get tier badge color based on tier name
  const getTierColor = (tierName: string) => {
    const tierColors: Record<string, string> = {
      'برونزية': 'bg-amber-100 text-amber-800',
      'فضية': 'bg-gray-100 text-gray-800',
      'ذهبية': 'bg-yellow-100 text-yellow-800',
      'بلاتينية': 'bg-slate-100 text-slate-800',
    }
    
    return tierColors[tierName] || 'bg-primary-100 text-primary-800'
  }

  // Add file upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير صالح",
        description: "يرجى اختيار صورة بتنسيق JPEG أو PNG أو GIF أو WebP",
        variant: "destructive"
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    
    const fileSize = file.size / 1024 / 1024 // in MB
    
    if (fileSize > 5) {
      toast({
        title: "الملف كبير جداً",
        description: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive"
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    
    // Add basic image dimensions validation
    try {
      const imageDimensions = await getImageDimensions(file)
      if (imageDimensions.width < 100 || imageDimensions.height < 100) {
        toast({
          title: "الصورة صغيرة جداً",
          description: "يجب أن تكون أبعاد الصورة 100×100 بكسل على الأقل",
          variant: "destructive"
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    } catch (err) {
      console.warn("Could not validate image dimensions", err)
      // Continue with upload even if dimension validation fails
    }
    
    try {
      setUploading(true)
      toast({
        title: "جاري تحميل الصورة",
        description: "يرجى الانتظار..."
      })
      
      // Use the server-side API for uploads instead of direct Supabase upload
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || "حدث خطأ أثناء تحميل الصورة")
      }
      
      // Use the URL from the server response
      const avatarUrl = result.url
      
      // Update user object locally without making another request
      if (user) {
        const updatedMetadata = {
          ...user.user_metadata,
          avatar_url: avatarUrl
        }
        
        setUser({
          ...user,
          user_metadata: updatedMetadata
        })
      }
      
      toast({
        title: "تم تحديث الصورة الشخصية",
        description: "تم تحديث صورتك الشخصية بنجاح"
      })
      
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast({
        title: "خطأ في تحميل الصورة",
        description: error.message || "حدث خطأ أثناء تحميل الصورة",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  // Helper function to get image dimensions
  const getImageDimensions = (file: File): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      img.onerror = () => {
        reject(new Error("Could not load image"))
      }
      img.src = URL.createObjectURL(file)
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <span className="text-lg font-medium">جاري تحميل البيانات...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      
      <div className="container mx-auto py-6 px-4 md:px-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-primary">الملف الشخصي</h1>

        <div className="grid grid-cols-1 gap-6">
          {/* User Profile Header Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/50 flex flex-col items-center justify-center py-8">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={formData.full_name} />
                  <AvatarFallback className="text-4xl">
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span className="sr-only">تغيير الصورة</span>
                </Button>
              </div>
              <CardTitle>{formData.full_name}</CardTitle>
              <CardDescription className="mt-1">{user?.email}</CardDescription>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="secondary" className="flex items-center gap-1 text-sm py-1.5">
                  {getLevelIcon()}
                  <span>المستوى {userLevel.level}</span>
                </Badge>
                
                {/* Add tier badge */}
                {userTier && userTier.currentTier && (
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 text-sm py-1.5 ${getTierColor(userTier.currentTier.name)}`}
                  >
                    <Trophy className="h-4 w-4" />
                    <span>الطبقة: {userTier.currentTier.name}</span>
                  </Badge>
                )}
                
                <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1 text-sm py-1.5">
                  <Trophy className="h-4 w-4" />
                  <span>{userPoints} نقطة</span>
                </Badge>
                
                <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center gap-1 text-sm py-1.5">
                  <Award className="h-4 w-4" />
                  <span>{userBadges.length} شارة</span>
                </Badge>
                
                <Badge variant="outline" className="bg-purple-50 text-purple-700 flex items-center gap-1 text-sm py-1.5">
                  <Medal className="h-4 w-4" />
                  <span>{userMedals.length} ميدالية</span>
                </Badge>
              </div>
              
              {/* Level Progress */}
              <div className="w-full max-w-md mt-6 px-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>المستوى {userLevel.level}</span>
                  <span>المستوى {userLevel.nextLevel}</span>
                </div>
                <Progress value={userLevel.progress} className="h-2" />
              </div>
            </CardHeader>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className={cn("grid w-full", isMobile ? "grid-cols-3" : "grid-cols-3 max-w-md mx-auto")}>
                <TabsTrigger value="profile">المعلومات الشخصية</TabsTrigger>
                <TabsTrigger value="badges">الشارات والأوسمة</TabsTrigger>
                <TabsTrigger value="security">الأمان</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="p-6">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-500 text-green-500">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={initiateProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" value={user?.email} disabled className="bg-muted/50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">الاسم الكامل</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      type="tel"
                    />
                  </div>

                  <Button 
                    type="button"
                    onClick={initiateProfileUpdate}
                    disabled={updating}
                    className="mt-4 w-full"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري تحديث الملف الشخصي...
                      </>
                    ) : "تحديث الملف الشخصي"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="badges" className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">شاراتي وأوسمتي</h3>
                    <Button variant="outline" size="sm" onClick={() => router.push('/badges')}>
                      عرض جميع الشارات
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card className="bg-primary/10 border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-md">المستوى الحالي</CardTitle>
                          {getLevelIcon()}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">المستوى {userLevel.level}</div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {userLevel.progress}% نحو المستوى {userLevel.nextLevel}
                        </p>
                        <Progress value={userLevel.progress} className="h-2" />
                        
                        {/* Add tier information */}
                        {userTier && userTier.currentTier && (
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">الطبقة:</span>
                            <Badge 
                              variant="outline" 
                              className={getTierColor(userTier.currentTier.name)}
                            >
                              {userTier.currentTier.name}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-amber-50 border-amber-200">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-md">النقاط المكتسبة</CardTitle>
                          <Trophy className="h-5 w-5 text-amber-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{userPoints}</div>
                        <p className="text-sm text-muted-foreground">إجمالي النقاط المكتسبة</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4">الشارات المكتسبة ({userBadges.length})</h3>
                  
                  {userBadges.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {userBadges.map(badge => (
                        <Card key={badge.id} className="overflow-hidden border border-muted">
                          <div className="aspect-square w-full bg-muted/50 flex items-center justify-center p-4">
                            {badge.image_url ? (
                              <img
                                src={badge.image_url}
                                alt={badge.name}
                                className="h-16 w-16 object-contain"
                              />
                            ) : (
                              badge.badge_type === "level" ? (
                                <Medal className="h-16 w-16 text-primary" />
                              ) : (
                                <Award className="h-16 w-16 text-amber-500" />
                              )
                            )}
                          </div>
                          <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-sm">{badge.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground">
                              تم الحصول عليها في {new Date(badge.awarded_at).toLocaleDateString("ar-SA")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="text-center p-8">
                      <CardContent>
                        <BadgeAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="mb-2">لا توجد شارات مكتسبة حالياً</p>
                        <Button variant="outline" onClick={() => router.push('/badges')}>
                          استكشف الشارات المتاحة
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Medals Section */}
                {userMedals.length > 0 && (
                  <Card className="overflow-hidden mb-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-lg gap-2">
                        <Medal className="h-5 w-5" />
                        الميداليات
                      </CardTitle>
                      <CardDescription>
                        الميداليات التي حصل عليها الطالب من المعلمين والإدارة
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {userMedals.map((medal: any) => (
                          <Card key={medal.id} className="overflow-hidden border border-muted">
                            <div className="aspect-square w-full bg-muted/50 flex items-center justify-center p-4">
                              {medal.image_url ? (
                                <img
                                  src={medal.image_url}
                                  alt={medal.name}
                                  className="h-16 w-16 object-contain"
                                />
                              ) : (
                                <Medal className="h-16 w-16 text-primary" />
                              )}
                            </div>
                            <CardHeader className="p-3 pb-1">
                              <CardTitle className="text-sm">{medal.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                              <p className="text-xs text-muted-foreground">
                                تم الحصول عليها في {new Date(medal.awarded_at).toLocaleDateString("ar-SA")}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="security" className="p-6">
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-500 text-green-500">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={initiatePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <Button 
                    type="button"
                    onClick={initiatePasswordUpdate}
                    disabled={updating}
                    className="mt-4 w-full"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري تحديث كلمة المرور...
                      </>
                    ) : "تحديث كلمة المرور"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Password Update Confirmation */}
      <ConfirmationDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        title="تأكيد تحديث كلمة المرور"
        description="هل أنت متأكد من رغبتك في تحديث كلمة المرور؟"
        confirmText="تأكيد التحديث"
        onConfirm={handlePasswordChange}
        isLoading={updating}
      >
        <div className="my-4 text-sm">
          <p>سيتم تغيير كلمة المرور الخاصة بك وسيتطلب منك تسجيل الدخول مرة أخرى.</p>
        </div>
      </ConfirmationDialog>

      {/* Profile Update Confirmation */}
      <ConfirmationDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        title="تأكيد تحديث الملف الشخصي"
        description="هل أنت متأكد من رغبتك في تحديث بيانات الملف الشخصي؟"
        confirmText="تأكيد التحديث"
        onConfirm={handleProfileUpdate}
        isLoading={updating}
      >
        <div className="my-4">
          <p className="text-sm">سيتم تحديث المعلومات الشخصية التالية:</p>
          <div className="mt-2 space-y-2 text-sm">
            <div><span className="font-medium">الاسم:</span> {formData.full_name}</div>
            <div><span className="font-medium">البريد الإلكتروني:</span> {user?.email}</div>
            <div><span className="font-medium">الهاتف:</span> {formData.phone || "غير محدد"}</div>
          </div>
        </div>
      </ConfirmationDialog>
    </DashboardLayout>
  )
}
