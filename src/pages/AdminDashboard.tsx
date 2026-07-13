import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Image, FileText, UserCog, Home, Book, Megaphone, Calendar, User, Library, Link2, ShieldCheck, ClipboardCheck, Mail, LayoutDashboard, DollarSign, CalendarRange } from "lucide-react";
import TermsManagement from "@/components/admin/TermsManagement";
import FeesManagement from "@/components/admin/FeesManagement";
import AdminOverview from "@/components/admin/AdminOverview";
import StudentsManagement from "@/components/admin/StudentsManagement";
import TeachersManagement from "@/components/admin/TeachersManagement";
import ClassesManagement from "@/components/admin/ClassesManagement";
import GalleryManagement from "@/components/admin/GalleryManagement";
import AssignmentsManagement from "@/components/admin/AssignmentsManagement";
import UserManagement from "@/components/admin/UserManagement";
import HeroSectionManagement from "@/components/admin/HeroSectionManagement";
import SubjectsManagement from "@/components/admin/SubjectsManagement";
import AnnouncementsManagement from "@/components/admin/AnnouncementsManagement";
import EventsManagement from "@/components/admin/EventsManagement";
import PrincipalManagement from "@/components/admin/PrincipalManagement";
import LibraryManagement from "@/components/admin/LibraryManagement";
import ClassSubjectsManagement from "@/components/admin/ClassSubjectsManagement";
import AuditLogsViewer from "@/components/admin/AuditLogsViewer";

import ImportantDatesManagement from "@/components/admin/ImportantDatesManagement";
import ContactSubmissionsViewer from "@/components/admin/ContactSubmissionsViewer";
import LoadingScreen from "@/components/LoadingScreen";

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  
  const defaultTab = searchParams.get("tab") || "overview";

  useEffect(() => {
    if (loading) return;

    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdminRole();
  }, [user, loading]);

  useEffect(() => {
    if (!loading && !checkingRole && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, loading, checkingRole, isAdmin, navigate]);

  if (loading || checkingRole) {
    return <LoadingScreen message="Loading admin dashboard..." />;
  }

  if (!isAdmin) {
    return <LoadingScreen message="Redirecting..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl">Admin Dashboard</CardTitle>
          <CardDescription>Manage your school's data and resources</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="hero" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
          <TabsTrigger value="principal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Principal</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Teachers</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Classes</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            <span className="hidden sm:inline">Subjects</span>
          </TabsTrigger>
          <TabsTrigger value="class-subjects" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Link</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline">Library</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Gallery</span>
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">Terms</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Fees</span>
          </TabsTrigger>
          <TabsTrigger value="important-dates" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Important Dates</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="hero">
          <HeroSectionManagement />
        </TabsContent>

        <TabsContent value="principal">
          <PrincipalManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="students">
          <StudentsManagement />
        </TabsContent>

        <TabsContent value="teachers">
          <TeachersManagement />
        </TabsContent>

        <TabsContent value="classes">
          <ClassesManagement />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsManagement />
        </TabsContent>

        <TabsContent value="class-subjects">
          <ClassSubjectsManagement />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsManagement />
        </TabsContent>

        <TabsContent value="library">
          <LibraryManagement />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsManagement />
        </TabsContent>

        <TabsContent value="events">
          <EventsManagement />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryManagement />
        </TabsContent>

        <TabsContent value="terms">
          <TermsManagement />
        </TabsContent>

        <TabsContent value="fees">
          <FeesManagement />
        </TabsContent>

        <TabsContent value="important-dates">
          <ImportantDatesManagement />
        </TabsContent>

        <TabsContent value="messages">
          <ContactSubmissionsViewer />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
