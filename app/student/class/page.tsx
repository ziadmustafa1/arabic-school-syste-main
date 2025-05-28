"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ChevronLeft, Users, School } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"

interface ClassData {
  id: number
  name: string
  grade: string
  academic_year: string
  semester: string
  teacher_name: string
  students_count: number
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadUserAndClasses() {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("لم يتم العثور على المستخدم")
        }
        
        setUserId(user.id)
        
        // Get student's classes
        const { data, error } = await supabase
          .from("class_student")
          .select(`
            class:class_id (
              id,
              name,
              grade,
              academic_year,
              semester,
              teacher:teacher_id (full_name)
            )
          `)
          .eq("student_id", user.id)
        
        // If that query failed, try with user_id instead of student_id
        if (error && error.message.includes("column class_student.student_id does not exist")) {
          console.log("Trying with user_id instead of student_id");
          const { data: altData, error: altError } = await supabase
            .from("class_student")
            .select(`
              class:class_id (
                id,
                name,
                grade,
                academic_year,
                semester,
                teacher:teacher_id (full_name)
              )
            `)
            .eq("user_id", user.id);
            
          if (altError) {
            throw altError;
          }
          
          if (altData && altData.length > 0) {
            const formattedClasses = altData.map(item => {
              // Safely access properties with optional chaining
              return {
                id: item.class?.id || 0,
                name: item.class?.name || "غير معروف",
                grade: item.class?.grade || "",
                academic_year: item.class?.academic_year || "",
                semester: item.class?.semester || "",
                teacher_name: item.class?.teacher?.full_name || "غير محدد",
                students_count: 0 // We'll get this in a future enhancement
              };
            });
            
            setClasses(formattedClasses);
            return; // Exit early since we have data
          }
        }
        
        if (error && !error.message.includes("column class_student.student_id does not exist")) {
          throw error;
        }
        
        if (data && data.length > 0) {
          const formattedClasses = data.map(item => ({
            id: item.class.id,
            name: item.class.name,
            grade: item.class.grade,
            academic_year: item.class.academic_year,
            semester: item.class.semester,
            teacher_name: item.class.teacher?.full_name || "غير محدد",
            students_count: 0 // We'll get this in a future enhancement
          }))
          
          setClasses(formattedClasses)
        }
      } catch (err: any) {
        console.error("Error loading classes:", err)
        toast({
          variant: "destructive",
          title: "خطأ في تحميل البيانات",
          description: err.message || "حدث خطأ أثناء تحميل بيانات الفصول",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadUserAndClasses()
  }, [supabase])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">جاري تحميل بيانات الفصول...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <BackButton />
        <h1 className="text-3xl font-bold">الفصول الدراسية</h1>
      </div>
      
      {classes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl mb-2">لا يوجد فصول دراسية</p>
          <p className="text-muted-foreground">لم يتم تعيينك في أي فصل دراسي حتى الآن</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{classItem.name}</span>
                  <School className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المرحلة الدراسية:</span>
                    <span>{classItem.grade || "غير محدد"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العام الدراسي:</span>
                    <span>{classItem.academic_year || "غير محدد"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفصل الدراسي:</span>
                    <span>{classItem.semester || "غير محدد"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المعلم:</span>
                    <span>{classItem.teacher_name}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/student/class/${classItem.id}`} className="w-full">
                  <Button variant="default" className="w-full">
                    عرض التفاصيل
                    <ChevronLeft className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 