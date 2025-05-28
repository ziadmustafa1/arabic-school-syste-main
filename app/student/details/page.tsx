"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, User, GraduationCap, Calendar, Mail, Phone, MapPin, Book } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { BackButton } from "@/components/back-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StudentDetails {
  id: string
  full_name: string
  email: string
  gender: string
  address: string
  birth_date: string
  grade: string
  user_code: string
  academic_year: string
  enrollment_date: string
  guardian_name: string
  guardian_phone: string
  profile_image_url: string | null
}

export default function StudentDetailsPage() {
  const [studentData, setStudentData] = useState<StudentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true)
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error("لم يتم العثور على المستخدم")
        }
        
        // Get student details
        const { data, error: studentError } = await supabase
          .from("users")
          .select(`
            id,
            full_name,
            email,
            gender,
            address,
            birth_date,
            grade,
            user_code,
            academic_year,
            enrollment_date,
            guardian_name,
            guardian_phone,
            profile_image_url
          `)
          .eq("id", user.id)
          .single()
        
        if (studentError) {
          throw studentError
        }
        
        setStudentData(data as StudentDetails)
      } catch (err: any) {
        console.error("Error loading student data:", err)
        setError(err.message || "حدث خطأ أثناء تحميل بيانات الطالب")
        toast({
          variant: "destructive",
          title: "خطأ في تحميل البيانات",
          description: err.message || "حدث خطأ أثناء تحميل بيانات الطالب",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadStudentData()
  }, [supabase])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">جاري تحميل بيانات الطالب...</p>
        </div>
      </div>
    )
  }
  
  if (error || !studentData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-xl text-destructive mb-2">حدث خطأ</p>
          <p className="text-muted-foreground">{error || "لم يتم العثور على بيانات الطالب"}</p>
        </div>
      </div>
    )
  }
  
  // Format date to a readable format or return "غير محدد" if null
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "غير محدد"
    try {
      return new Date(dateString).toLocaleDateString('ar-EG')
    } catch (err) {
      return "غير محدد"
    }
  }
  
  // Get initials from full name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <BackButton />
        <h1 className="text-3xl font-bold">البيانات الشخصية</h1>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-1/3">
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={studentData.profile_image_url || ""} alt={studentData.full_name} />
                <AvatarFallback>{getInitials(studentData.full_name)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-1">{studentData.full_name}</h2>
              <p className="text-muted-foreground mb-4">{studentData.user_code || "بدون كود"}</p>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>{studentData.grade || "غير محدد"}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{studentData.academic_year || "غير محدد"}</span>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
              <TabsTrigger value="academic">البيانات الأكاديمية</TabsTrigger>
              <TabsTrigger value="guardian">بيانات ولي الأمر</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="text-right">البيانات الشخصية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                      <p className="font-medium">{studentData.full_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium">{studentData.email || "غير محدد"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium">غير متوفر</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                      <p className="font-medium">{formatDate(studentData.birth_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{studentData.address || "غير محدد"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="academic">
              <Card>
                <CardHeader>
                  <CardTitle className="text-right">البيانات الأكاديمية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Book className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">المرحلة الدراسية</p>
                      <p className="font-medium">{studentData.grade || "غير محدد"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">العام الدراسي</p>
                      <p className="font-medium">{studentData.academic_year || "غير محدد"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الالتحاق</p>
                      <p className="font-medium">{formatDate(studentData.enrollment_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الرمز التعريفي</p>
                      <p className="font-medium">{studentData.user_code || "غير محدد"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="guardian">
              <Card>
                <CardHeader>
                  <CardTitle className="text-right">بيانات ولي الأمر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">اسم ولي الأمر</p>
                      <p className="font-medium">{studentData.guardian_name || "غير محدد"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم هاتف ولي الأمر</p>
                      <p className="font-medium">{studentData.guardian_phone || "غير محدد"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 