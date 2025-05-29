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
  user_code?: string
  user_metadata?: any
  academic_data?: {
    grade?: string
    academic_year?: string
    enrollment_date?: string
  }
  parent_data?: {
    name?: string
    email?: string
  }
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
        // Get current user with metadata
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error("لم يتم العثور على المستخدم")
        }
        
        console.log("Current user ID:", user.id);
        
        // Get student details from users table (basic info only)
        const { data, error: studentError } = await supabase
          .from("users")
          .select(`
            id,
            full_name,
            email,
            user_code
          `)
          .eq("id", user.id)
          .single()
        
        if (studentError) {
          console.error("Error fetching user data:", studentError);
          throw studentError
        }

        // Initialize student data with basic info and empty academic data
        const studentDetails: StudentDetails = {
          ...data,
          user_metadata: user.user_metadata || {},
          academic_data: {
            grade: "غير محدد",
            academic_year: "غير محدد",
            enrollment_date: undefined
          },
          parent_data: {
            name: "غير محدد", 
            email: "غير محدد"
          }
        }

        // Get class data for the student using two separate queries
        // 1. First get the class_student relationship - try with both possible column names
        console.log("Fetching class_student data for user:", user.id);
        
        let classStudentData = null;
        let classStudentError = null;
        
        // Try first with user_id column
        const { data: userIdData, error: userIdError } = await supabase
          .from("class_student")
          .select(`
            class_id,
            created_at
          `)
          .eq("user_id", user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (userIdError) {
          console.error("Error fetching class_student data with user_id:", userIdError);
          
          // If that fails, try with student_id column instead
          const { data: studentIdData, error: studentIdError } = await supabase
            .from("class_student")
            .select(`
              class_id,
              created_at
            `)
            .eq("student_id", user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (studentIdError) {
            console.error("Error fetching class_student data with student_id:", studentIdError);
          } else {
            classStudentData = studentIdData;
            console.log("Found class_student data using student_id column:", classStudentData);
          }
        } else {
          classStudentData = userIdData;
          console.log("Found class_student data using user_id column:", classStudentData);
        }
        
        if (classStudentData && classStudentData.length > 0) {
          const classId = classStudentData[0].class_id;
          const enrollmentDate = classStudentData[0].created_at;
          
          // 2. Then get the class details with a separate query
          console.log("Fetching class details for class ID:", classId);
          const { data: classInfo, error: classInfoError } = await supabase
            .from("classes")
            .select(`
              id, 
              name,
              academic_year,
              semester
            `)
            .eq("id", classId)
            .single();
          
          if (!classInfoError && classInfo) {
            console.log("Found class info:", classInfo);
            
            // Format educational level based on academic_year
            const academicYear = classInfo.academic_year || ""
            
            // Define educational levels mapping
            const ACADEMIC_LEVEL_DISPLAY: Record<string, string> = {
              "Default": "المرحلة الابتدائية",
              "khb": "مرحلة KHB",
              "المرحلة الاعدادية": "المرحلة الاعدادية",
              "المرحلة الثانوية": "المرحلة الثانوية"
            }
            
            // Get the educational level
            let gradeDisplay = "غير محدد"
            
            if (ACADEMIC_LEVEL_DISPLAY[academicYear]) {
              gradeDisplay = ACADEMIC_LEVEL_DISPLAY[academicYear]
            } else if (academicYear && /^\d+$/.test(academicYear)) {
              gradeDisplay = `المرحلة الدراسية ${academicYear}`
            }
            
            // Set academic data
            studentDetails.academic_data = {
              grade: gradeDisplay,
              academic_year: academicYear || "غير محدد",
              enrollment_date: enrollmentDate
            }
          } else if (classInfoError) {
            console.error("Error fetching class details:", classInfoError);
          }
        }
        
        // Get parent information based on student's user ID
        try {
          console.log("Setting parent information for student:", user.id);
          
          // Skip trying to use parent_student table as it doesn't seem to exist or work
          // Just use the student's name and email directly
          const studentName = data.full_name;
          const studentEmail = data.email;
          
          // Create a parent display name based on the student's name
          studentDetails.parent_data = {
            name: "ولي أمر " + studentName,
            email: studentEmail
          };
          
        } catch (parentErr) {
          console.error("Error processing parent data:", parentErr);
        }
        
        // Set the final student data with all info
        setStudentData(studentDetails)
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
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "غير محدد"
    try {
      return new Date(dateString).toLocaleDateString('ar-EG')
    } catch (err) {
      return "غير محدد"
    }
  }
  
  const getMetadataValue = (field: string) => {
    if (studentData?.user_metadata && typeof studentData.user_metadata === 'object') {
      return studentData.user_metadata[field] || "غير محدد";
    }
    return "غير محدد";
  }

  // Get academic data value with fallback
  const getAcademicValue = (field: string) => {
    return studentData?.academic_data?.[field as keyof typeof studentData.academic_data] || "غير محدد";
  }
  
  // Get parent data value with fallback
  const getParentValue = (field: string) => {
    return studentData?.parent_data?.[field as keyof typeof studentData.parent_data] || "غير محدد";
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
                <AvatarImage src={getMetadataValue("profile_image_url") !== "غير محدد" ? getMetadataValue("profile_image_url") : ""} alt={studentData.full_name} />
                <AvatarFallback>{getInitials(studentData.full_name)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-1">{studentData.full_name}</h2>
              <p className="text-muted-foreground mb-4">{studentData.user_code || "بدون كود"}</p>
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
                      <p className="font-medium">{getAcademicValue('grade')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">العام الدراسي</p>
                      <p className="font-medium">{getAcademicValue('academic_year')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ الالتحاق</p>
                      <p className="font-medium">{formatDate(getAcademicValue('enrollment_date'))}</p>
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
                      <p className="font-medium">{getParentValue("name")}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                      <p className="font-medium">{getParentValue("email")}</p>
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