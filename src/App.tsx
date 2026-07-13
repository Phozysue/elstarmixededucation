import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Academics from "./pages/Academics";
import Admissions from "./pages/Admissions";
import AdmissionsForm from "./pages/AdmissionsForm";
import Gallery from "./pages/Gallery";
import Library from "./pages/Library";
import NewsEvents from "./pages/NewsEvents";
import Contact from "./pages/Contact";
import Staff from "./pages/Staff";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import NotFound from "./pages/NotFound";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="academics" element={<Academics />} />
              <Route path="admissions" element={<Admissions />} />
              <Route path="admissions/apply" element={<AdmissionsForm />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="library" element={
                <RoleProtectedRoute allowedRoles={["admin", "teacher", "student"]}>
                  <Library />
                </RoleProtectedRoute>
              } />
              
              <Route path="news-events" element={<NewsEvents />} />
              <Route path="staff" element={<Staff />} />
              <Route path="contact" element={<Contact />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
