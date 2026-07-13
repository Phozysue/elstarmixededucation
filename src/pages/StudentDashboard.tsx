import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Megaphone, LayoutDashboard, Library as LibraryIcon, Award, DollarSign, FileCheck } from "lucide-react";
import AssignmentsList from "@/components/assignments/AssignmentsList";
import StudentOverview from "@/components/student/StudentOverview";
import StudentAnnouncements from "@/components/student/StudentAnnouncements";
import StudentSubjects from "@/components/student/StudentSubjects";
import StudentResults from "@/components/student/StudentResults";
import StudentReportCards from "@/components/student/StudentReportCards";
import StudentFees from "@/components/student/StudentFees";
import Library from "@/pages/Library";
import LoadingScreen from "@/components/LoadingScreen";

interface StudentData {
  id: string;
  student_id: string;
  class_id: string | null;
}

const StudentDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isStudent, setIsStudent] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  useEffect(() => {
    if (loading) return;

    const checkStudentRole = async () => {
      if (!user) {
        setIsStudent(false);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);
      try {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "student")
          .maybeSingle();

        if (roleError) throw roleError;
        setIsStudent(!!roleData);

        if (roleData) {
          const { data: student, error: studentError } = await supabase
            .from("students")
            .select("id, student_id, class_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (studentError) console.error("Error loading student record:", studentError);
          setStudentData(student ?? null);
        }
      } catch (error) {
        console.error("Error checking student role:", error);
        setIsStudent(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkStudentRole();
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !checkingRole && (!user || !isStudent)) {
      navigate("/");
    }
  }, [user, loading, checkingRole, isStudent, navigate]);

  if (loading || checkingRole) {
    return <LoadingScreen message="Loading student dashboard..." />;
  }

  if (!isStudent) {
    return <LoadingScreen message="Redirecting..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">Student Dashboard</CardTitle>
          <CardDescription>
            Student ID: {studentData?.student_id || "Loading..."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-1">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="results">
            <Award className="h-4 w-4 mr-2" /> Results
          </TabsTrigger>
          <TabsTrigger value="report-cards">
            <FileCheck className="h-4 w-4 mr-2" /> Report Cards
          </TabsTrigger>
          <TabsTrigger value="fees">
            <DollarSign className="h-4 w-4 mr-2" /> Fees
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <FileText className="h-4 w-4 mr-2" /> Assignments
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <BookOpen className="h-4 w-4 mr-2" /> Subjects
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="h-4 w-4 mr-2" /> Announcements
          </TabsTrigger>
          <TabsTrigger value="library">
            <LibraryIcon className="h-4 w-4 mr-2" /> Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {studentData ? (
            <StudentOverview studentId={studentData.id} classId={studentData.class_id} />
          ) : (
            <LoadingScreen message="Loading overview..." />
          )}
        </TabsContent>

        <TabsContent value="results">
          {studentData ? <StudentResults studentId={studentData.id} /> : <LoadingScreen message="Loading..." />}
        </TabsContent>

        <TabsContent value="report-cards">
          {studentData ? <StudentReportCards studentId={studentData.id} /> : <LoadingScreen message="Loading..." />}
        </TabsContent>

        <TabsContent value="fees">
          {studentData ? <StudentFees studentId={studentData.id} /> : <LoadingScreen message="Loading..." />}
        </TabsContent>

        <TabsContent value="assignments">
          {studentData ? (
            <AssignmentsList
              filterByClassId={studentData.class_id || undefined}
              title="My Assignments"
              description="Assignments for your class"
              studentId={studentData.id}
            />
          ) : (
            <LoadingScreen message="Loading assignments..." />
          )}
        </TabsContent>

        <TabsContent value="subjects">
          <StudentSubjects classId={studentData?.class_id ?? null} />
        </TabsContent>

        <TabsContent value="announcements">
          <StudentAnnouncements />
        </TabsContent>

        <TabsContent value="library">
          <Library />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentDashboard;
