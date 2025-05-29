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
        console.log("Current user ID:", user.id)
        
        // Log Supabase connection info (for debugging)
        console.log("Supabase client initialized:", !!supabase)
        
        // Get student's classes with more detailed logging
        try {
          console.log("Attempting to fetch classes for user:", user.id)
          
          // استعلام بسيط للحصول على الفصول المرتبطة بالمستخدم الحالي
          const { data: userClassesData, error: userClassesError } = await supabase
            .from("class_student")
            .select("class_id")
            .eq("user_id", user.id)
          
          console.log("User classes query result:", userClassesError ? "Error" : (userClassesData ? `Found ${userClassesData.length} classes` : "No data"))
          
          if (!userClassesError && userClassesData && userClassesData.length > 0) {
            const classIds = userClassesData.map(item => item.class_id)
            console.log("Class IDs:", classIds)
            
            // Expanded query to get more class information including grade and related teacher
            // Fix the query format for the .in() filter - it's causing a 400 Bad Request
            try {
              console.log("Attempting to fetch class details for IDs:", classIds);
              
              // Option 1: Use individual queries for each class ID to avoid .in() filter issues
              const classesData = [];
              let queryFailed = false;
              
              for (const classId of classIds) {
                console.log(`Fetching class with ID: ${classId}`);
                try {
                  const { data: singleClassData, error: singleClassError } = await supabase
                    .from("classes")
                    .select("id, name, academic_year, semester")
                    .eq("id", classId)
                    .single();
                    
                  if (!singleClassError && singleClassData) {
                    console.log(`Successfully fetched class ${classId}:`, singleClassData);
                    classesData.push(singleClassData);
                  } else {
                    console.error(`Error fetching class ${classId}:`, singleClassError);
                    queryFailed = true;
                  }
                } catch (singleQueryErr) {
                  console.error(`Exception fetching class ${classId}:`, singleQueryErr);
                  queryFailed = true;
                }
              }
              
              console.log("Classes data fetched individually:", classesData.length);
              
              // Option 2: If individual queries failed, try using .or filter
              if (queryFailed || classesData.length === 0) {
                console.log("Individual queries failed or returned no data. Trying alternative approach with .or filter");
                
                try {
                  let query = supabase
                    .from("classes")
                    .select("id, name, academic_year, semester");
                    
                  // Build the OR condition for each class ID
                  for (let i = 0; i < classIds.length; i++) {
                    const classId = classIds[i];
                    if (i === 0) {
                      query = query.eq("id", classId);
                    } else {
                      query = query.or(`id.eq.${classId}`);
                    }
                  }
                  
                  const { data: orFilterData, error: orFilterError } = await query;
                  
                  if (!orFilterError && orFilterData && orFilterData.length > 0) {
                    console.log("Successfully fetched classes using .or filter:", orFilterData.length);
                    classesData.length = 0; // Clear the array
                    classesData.push(...orFilterData);
                  } else {
                    console.error("Error fetching classes using .or filter:", orFilterError);
                  }
                } catch (orFilterErr) {
                  console.error("Exception using .or filter:", orFilterErr);
                }
              }
              
              // Option 3: If all approaches failed, try fetching each class without using a filter
              if (classesData.length === 0) {
                console.log("Trying final approach: fetch all classes and filter client-side");
                try {
                  const { data: allClasses, error: allClassesError } = await supabase
              .from("classes")
                    .select("id, name, academic_year, semester")
                    .limit(50); // Limit to avoid huge data transfer
                    
                  if (!allClassesError && allClasses && allClasses.length > 0) {
                    // Filter client-side
                    const filteredClasses = allClasses.filter(cls => 
                      classIds.includes(cls.id)
                    );
                    
                    if (filteredClasses.length > 0) {
                      console.log("Found classes via client-side filtering:", filteredClasses.length);
                      classesData.length = 0;
                      classesData.push(...filteredClasses);
                    }
                  }
                } catch (allClassesErr) {
                  console.error("Exception fetching all classes:", allClassesErr);
                }
              }
              
              console.log("Final classes data count:", classesData.length);
              
              if (classesData.length > 0) {
                // Format the educational level display based on the admin configuration
                const formatGrade = (grade: string | null, academicYear: string | null) => {
                  if (!academicYear) return "غير محددة";
                  
                  const ACADEMIC_LEVEL_DISPLAY: Record<string, string> = {
                    "Default": "المرحلة الابتدائية",
                    "khb": "مرحلة KHB",
                    "المرحلة الاعدادية": "المرحلة الاعدادية",
                    "المرحلة الثانوية": "المرحلة الثانوية"
                  };
                  
                  // Since grade doesn't exist, we'll use academic_year instead
                  if (academicYear && ACADEMIC_LEVEL_DISPLAY[academicYear]) {
                    return ACADEMIC_LEVEL_DISPLAY[academicYear];
                  }
                  
                  // If it's a numeric year, format it as a Hijri year
                  if (academicYear && /^\d+$/.test(academicYear)) {
                    return `العام الدراسي ${academicYear}هـ`;
                  }
                  
                  // Otherwise return the raw value
                  return academicYear || "غير محددة";
                };
                
                // Since teacher_id doesn't exist in the classes table, we'll try to get teacher info from class_teacher
                let teachersByClassId: Record<number, string> = {};
                
                try {
                  // Get teacher information using class_teacher relation table
                  console.log("Attempting to fetch teacher relations for classes:", classesData.map(c => c.id));
                  
                  const { data: classTeacherData, error: classTeacherError } = await supabase
                    .from("class_teacher")
                    .select(`
                      class_id,
                      teacher_id,
                      users:teacher_id (
                        id,
                        full_name
                      )
                    `)
                    .in("class_id", classesData.map(c => c.id));
                  
                  if (!classTeacherError && classTeacherData && classTeacherData.length > 0) {
                    console.log(`Found ${classTeacherData.length} teacher relationships`);
                    // Group teachers by class_id
                    for (const relation of classTeacherData as any[]) {
                      if (relation.class_id) {
                        // Get the teacher name safely using optional chaining
                        const teacherName = relation.users?.full_name || relation.users?.[0]?.full_name;
                        if (teacherName) {
                          teachersByClassId[relation.class_id] = teacherName;
                        }
                      }
                    }
                    console.log("Teachers by class mapping:", teachersByClassId);
                  } else {
                    console.log("No teacher relationships found:", classTeacherError);
                  }
                } catch (teacherErr) {
                  console.error("Error fetching teacher relationships:", teacherErr);
                }
                
                const formattedClasses = classesData.map((item: any) => {
                  // Get teacher name if available from our mapping
                  const teacherName = teachersByClassId[item.id] || "غير محدد";
                  
                return {
                  id: item.id,
                  name: item.name || "غير معروف",
                    grade: formatGrade(null, item.academic_year),
                  academic_year: item.academic_year || "",
                  semester: item.semester || "",
                    teacher_name: teacherName,
                  students_count: 0
                };
              });
              
              setClasses(formattedClasses)
              }
            } catch (queryErr) {
              console.error("Class detail query error:", queryErr)
              toast({
                variant: "destructive",
                title: "خطأ في تحميل بيانات الفصول",
                description: "حدث خطأ أثناء محاولة الاستعلام عن تفاصيل الفصول",
              })
            }
          } else {
            // إذا لم يتم العثور على فصول للمستخدم، حاول الحصول على عينة من الفصول
            console.log("No classes found for user, trying to get sample classes")
            
            try {
            const { data: sampleClassesData, error: sampleClassesError } = await supabase
              .from("classes")
                .select("id, name, academic_year, semester")
              .limit(5)
            
              console.log("Sample classes result:", sampleClassesError ? "Error" : (sampleClassesData ? `Found ${sampleClassesData?.length} classes` : "No data"))
            
            if (!sampleClassesError && sampleClassesData && sampleClassesData.length > 0) {
                // Use the same formatGrade function as defined earlier
                const formatGrade = (grade: string | null, academicYear: string | null) => {
                  if (!academicYear) return "غير محددة";
                  
                  const ACADEMIC_LEVEL_DISPLAY: Record<string, string> = {
                    "Default": "المرحلة الابتدائية",
                    "khb": "مرحلة KHB",
                    "المرحلة الاعدادية": "المرحلة الاعدادية",
                    "المرحلة الثانوية": "المرحلة الثانوية"
                  };
                  
                  // Since grade doesn't exist, we'll use academic_year instead
                  if (academicYear && ACADEMIC_LEVEL_DISPLAY[academicYear]) {
                    return ACADEMIC_LEVEL_DISPLAY[academicYear];
                  }
                  
                  // If it's a numeric year, format it as a Hijri year
                  if (academicYear && /^\d+$/.test(academicYear)) {
                    return `العام الدراسي ${academicYear}هـ`;
                  }
                  
                  return academicYear || "غير محددة";
                };
                
                const formattedClasses = sampleClassesData.map((item: any) => {
                return {
                  id: item.id,
                  name: item.name || "غير معروف (عينة)",
                    grade: formatGrade(null, item.academic_year),
                  academic_year: item.academic_year || "",
                  semester: item.semester || "",
                    teacher_name: "غير محدد",
                  students_count: 0
                };
              });
              
              setClasses(formattedClasses)
              }
            } catch (sampleErr) {
              console.error("Error fetching sample classes:", sampleErr);
            }
          }
        } catch (queryErr) {
          console.error("Exception during class query:", queryErr)
          toast({
            variant: "destructive",
            title: "خطأ في تحميل البيانات",
            description: "حدث خطأ أثناء محاولة الاستعلام عن بيانات الفصول",
          })
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
          <p className="mt-4 text-xs text-muted-foreground">معرف المستخدم: {userId || "غير متوفر"}</p>
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
                    <span className={!classItem.grade || classItem.grade === "غير محددة" ? "text-gray-400" : ""}>{classItem.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العام الدراسي:</span>
                    <span className={!classItem.academic_year ? "text-gray-400" : ""}>{classItem.academic_year || "غير محدد"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الفصل الدراسي:</span>
                    <span className={!classItem.semester ? "text-gray-400" : ""}>{classItem.semester || "غير محدد"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المعلم:</span>
                    <span className={classItem.teacher_name === "غير محدد" ? "text-gray-400" : ""}>{classItem.teacher_name}</span>
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