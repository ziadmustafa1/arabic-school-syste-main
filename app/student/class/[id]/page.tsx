"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Users, School, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { ClassTeachers } from "@/app/components/class/class-teachers"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getHijriYear } from "@/lib/utils/hijri-date"

function ClassStudents({ classId }: { classId: number }) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadStudents() {
      if (!classId) return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("class_student")
          .select(`
            user_id,
            users:user_id (
              id, 
              full_name,
              user_code
            )
          `)
          .eq("class_id", classId)
        
        if (error) throw error
        
        // Преобразуем данные в правильный формат
        const formattedStudents = data.map((item) => {
          const userData = item.users as any
          return {
            id: userData.id,
            full_name: userData.full_name,
            user_code: userData.user_code
          }
        })
        
        setStudents(formattedStudents || [])
      } catch (err: any) {
        console.error("Error loading students:", err)
        setError(err.message || "حدث خطأ أثناء تحميل الطلاب")
      } finally {
        setLoading(false)
      }
    }
    
    loadStudents()
  }, [classId, supabase])
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right">طلاب الصف</CardTitle>
          <CardDescription className="text-right">قائمة بطلاب الصف الدراسي</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-right">طلاب الصف</CardTitle>
          <CardDescription className="text-right">قائمة بطلاب الصف الدراسي</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right">طلاب الصف</CardTitle>
        <CardDescription className="text-right">قائمة بطلاب الصف الدراسي</CardDescription>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا يوجد طلاب مسجلين في هذا الصف</p>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <Avatar>
                  <AvatarFallback>
                    {student.full_name?.substring(0, 2) || <Users className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">{student.user_code}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ClassDetailsPage() {
  const { id } = useParams()
  const classId = typeof id === 'string' ? parseInt(id) : 0
  const [classData, setClassData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherData, setTeacherData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadClassData() {
      if (!classId) {
        setError("معرف الفصل غير صالح")
        setLoading(false)
        return
      }
      
      setLoading(true)
      try {
        // Simplify the query to avoid relationship errors
        const { data, error: classError } = await supabase
          .from("classes")
          .select("*")  // Select all columns directly from classes table
          .eq("id", classId)
          .single()
        
        if (classError) {
          throw classError
        }
        
        // Debug: Log the class data structure 
        console.log("Class data retrieved:", data)
        console.log("Available fields:", Object.keys(data || {}))
        
        // Add more debug output
        console.log("Class data fields:", data && Object.keys(data).map(key => `${key}: ${data[key]}`));
        
        setClassData(data)
        
        // Try multiple approaches to get educational level information
        
        // 1. Check if any of the fields directly contain the educational level
        const potentialGradeFields = [
          'grade', 'grade_name', 'educational_level', 'level', 'stage', 
          'educational_stage', 'stage_name', 'class_level'
        ];
        
        let levelFound = false;
        for (const field of potentialGradeFields) {
          if (data && data[field]) {
            console.log(`Found grade info in field: ${field} = ${data[field]}`);
            levelFound = true;
            // No need to update classData as it already has this field
            break;
          }
        }
        
        // 2. Try potential ID fields to look up in related tables
        if (!levelFound) {
          const potentialIdFields = [
            'grade_id', 'level_id', 'stage_id', 'educational_level_id', 'educational_stage_id'
          ];
          
          for (const idField of potentialIdFields) {
            if (!levelFound && data && data[idField]) {
              console.log(`Found ID field: ${idField} = ${data[idField]}`);
              
              // Try each of the possible tables that might contain grade information
              const possibleTables = ['grades', 'levels', 'stages', 'educational_levels', 'educational_stages'];
              
              for (const table of possibleTables) {
                if (levelFound) break;
                
                try {
                  console.log(`Trying to find grade in table: ${table} with id: ${data[idField]}`);
                  
                  const { data: relatedData, error: relatedError } = await supabase
                    .from(table)
                    .select("name, title, label")
                    .eq("id", data[idField])
                    .single();
                    
                  if (!relatedError && relatedData) {
                    console.log(`Found grade info in table ${table}:`, relatedData);
                    
                    // Use first available field
                    const gradeName = relatedData.name || relatedData.title || relatedData.label;
                    
                    if (gradeName) {
                      setClassData((prev: any) => ({ ...prev, grade_name: gradeName }));
                      levelFound = true;
                      break;
                    }
                  }
                } catch (err) {
                  console.log(`Table ${table} not found or other error:`, err);
                }
              }
            }
          }
        }
        
        // If we still haven't found anything, make one last direct query
        if (!levelFound) {
          try {
            // Try a direct SQL query
            const { data: sql_data, error: sql_error } = await supabase.rpc('get_class_educational_level', {
              class_id: classId
            });
            
            if (!sql_error && sql_data) {
              console.log("Direct SQL query result:", sql_data);
              setClassData((prev: any) => ({ ...prev, grade_name: sql_data }));
              levelFound = true;
            }
          } catch (sqlErr) {
            console.log("Direct SQL query not available:", sqlErr);
          }
        }
        
        // Try to fetch main teacher data
        const { data: teacherRelationData, error: teacherRelationError } = await supabase
          .from("class_teacher")
          .select(`
            teacher_id,
            is_main_teacher,
            users:teacher_id (
              id,
              full_name,
              user_code
            )
          `)
          .eq("class_id", classId)
          .eq("is_main_teacher", true)
          .single()
          
        if (!teacherRelationError && teacherRelationData?.users) {
          setTeacherData(teacherRelationData.users)
        } else {
          // Try to get any teacher if no main teacher
          const { data: anyTeacherData, error: anyTeacherError } = await supabase
            .from("class_teacher")
            .select(`
              teacher_id,
              users:teacher_id (
                id,
                full_name,
                user_code
              )
            `)
            .eq("class_id", classId)
            .limit(1)
            .single()
            
          if (!anyTeacherError && anyTeacherData?.users) {
            setTeacherData(anyTeacherData.users)
          }
        }
        
      } catch (err: any) {
        console.error("Error loading class data:", err)
        setError(err.message || "حدث خطأ أثناء تحميل بيانات الفصل")
        toast({
          variant: "destructive",
          title: "خطأ في تحميل البيانات",
          description: err.message || "حدث خطأ أثناء تحميل بيانات الفصل",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadClassData()
  }, [classId, supabase])
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">جاري تحميل بيانات الفصل...</p>
        </div>
      </div>
    )
  }
  
  if (error || !classData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-xl text-destructive mb-2">حدث خطأ</p>
          <p className="text-muted-foreground">{error || "لم يتم العثور على بيانات الفصل"}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">بيانات الفصل {classData.name}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">اسم الفصل</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.name || "لا يوجد اسم"}</div>
            <p className="text-xs text-muted-foreground">
              المرحلة الدراسية: <span className={getGradeDisplayClass(classData)}>
                {getGradeDisplay(classData)}
              </span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المعلم المسؤول</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {teacherData ? teacherData.full_name : "لم يتم تعيين معلم"}
            </div>
            <p className="text-xs text-muted-foreground">
              الرمز: <span className={!teacherData?.user_code ? "text-gray-400" : ""}>
                {teacherData?.user_code || "غير متوفر"}
              </span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">العام الدراسي</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classData.academic_year || "غير محدد"}</div>
            <p className="text-xs text-muted-foreground">
              الفصل الدراسي: <span className={!classData.semester ? "text-gray-400" : ""}>
                {classData.semester || "غير محدد"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="teachers">المعلمون المسؤولون</TabsTrigger>
          <TabsTrigger value="students">طلاب الصف</TabsTrigger>
        </TabsList>
        
        <TabsContent value="teachers">
          <ClassTeachers classId={classId} />
        </TabsContent>
        
        <TabsContent value="students">
          <ClassStudents classId={classId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to get the grade display text
function getGradeDisplay(classData: any): string {
  // Based on the admin page configuration
  const ACADEMIC_LEVEL_DISPLAY: Record<string, string> = {
    "Default": "المرحلة الابتدائية",
    "khb": "مرحلة KHB",
    "المرحلة الاعدادية": "المرحلة الاعدادية",
    "المرحلة الثانوية": "المرحلة الثانوية"
  };
  
  // Get the academic_year value directly from the class data
  const academicYear = classData.academic_year || "";
  
  // Return based on academic_year since grade doesn't exist
  if (ACADEMIC_LEVEL_DISPLAY[academicYear]) {
    return ACADEMIC_LEVEL_DISPLAY[academicYear];
  } 
  
  // If it's a numeric year, format it as a Hijri year
  if (/^\d+$/.test(academicYear)) {
    return `العام الدراسي ${academicYear}هـ`;
  }
  
  // Otherwise return the raw value
  return academicYear || "غير محددة";
}

// Helper function for CSS class
function getGradeDisplayClass(classData: any): string {
  return classData.academic_year ? "" : "text-gray-400";
} 