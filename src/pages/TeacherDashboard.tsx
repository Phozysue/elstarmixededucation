import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Calendar, LayoutDashboard, ClipboardEdit, FileCheck } from "lucide-react";
import TeacherOverview from "@/components/teacher/TeacherOverview";
import ClassesManagement from "@/components/admin/ClassesManagement";
import AssignmentsManagement from "@/components/admin/AssignmentsManagement";
import AssignmentsList from "@/components/assignments/AssignmentsList";
import SubmissionsManagement from "@/components/assignments/SubmissionsManagement";
import AttendanceManagement from "@/components/admin/AttendanceManagement";
import MarksEntry from "@/components/teacher/MarksEntry";
import ReportCardsManagement from "@/components/teacher/ReportCardsManagement";
import LoadingScreen from "@/components/LoadingScreen";

const TeacherDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isTeacher, setIsTeacher] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (loading) return;

    const checkTeacherRole = async () => {
      if (!user) {
        setIsTeacher(false);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "teacher")
          .maybeSingle();

        if (error) throw error;
        setIsTeacher(!!data);
      } catch (error) {
        console.error("Error checking teacher role:", error);
        setIsTeacher(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkTeacherRole();
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !checkingRole && (!user || !isTeacher)) {
      navigate("/");
    }
  }, [user, loading, checkingRole, isTeacher, navigate]);

  if (loading || checkingRole) {
    return <LoadingScreen message="Loading teacher dashboard..." />;
  }

  if (!isTeacher) {
    return <LoadingScreen message="Redirecting..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">Teacher Dashboard</CardTitle>
          <CardDescription>Manage your classes, students, and assignments</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Classes</span>
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex items-center gap-2">
            <ClipboardEdit className="h-4 w-4" />
            <span className="hidden sm:inline">Marks</span>
          </TabsTrigger>
          <TabsTrigger value="report-cards" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Report Cards</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeacherOverview />
        </TabsContent>

        <TabsContent value="classes">
          <ClassesManagement readOnly />
        </TabsContent>

        <TabsContent value="marks">
          <MarksEntry />
        </TabsContent>

        <TabsContent value="report-cards">
          <ReportCardsManagement />
        </TabsContent>

        <TabsContent value="assignments">
          <Tabs defaultValue="manage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="manage">Manage Assignments</TabsTrigger>
              <TabsTrigger value="view">View All Assignments</TabsTrigger>
              <TabsTrigger value="submissions">Submissions & Grading</TabsTrigger>
            </TabsList>
            <TabsContent value="manage">
              <AssignmentsManagement />
            </TabsContent>
            <TabsContent value="view">
              <AssignmentsList 
                title="All Assignments" 
                description="Browse and filter all assignments by class or subject" 
              />
            </TabsContent>
            <TabsContent value="submissions">
              <SubmissionsManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;
