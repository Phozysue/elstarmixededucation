import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const studentSchema = z.object({
  admissionNumber: z.string().regex(/^ADM\d+$/i, "Admission number must start with ADM followed by numbers"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [studentLogin, setStudentLogin] = useState({ admissionNumber: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse(loginData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Check user role(s) and redirect accordingly
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid ?? "");

      const roles = (rolesData ?? []).map(r => r.role as string);
      toast.success("Welcome back!");

      // Priority order for landing page
      const priority = ["admin", "principal", "bursar", "class_teacher", "teacher", "parent", "student"] as const;
      const primary = priority.find(r => roles.includes(r));
      const routeMap: Record<string, string> = {
        admin: "/admin", principal: "/principal", bursar: "/bursar",
        class_teacher: "/class-teacher", teacher: "/teacher",
        parent: "/parent", student: "/student",
      };
      navigate(primary ? routeMap[primary] : "/");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = studentSchema.safeParse(studentLogin);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("student-login", {
        body: {
          admissionNumber: studentLogin.admissionNumber.trim().toUpperCase(),
          password: studentLogin.password,
        },
      });

      if (error || !data?.access_token) {
        toast.error("Invalid admission number or password");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        toast.error("Could not start your session. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      navigate("/student");
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Staff & Student Portal</CardTitle>
          <CardDescription className="text-center">
            Sign in with the credentials provided by the administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="staff" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff / Parent</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admission-number">Admission Number</Label>
                  <Input
                    id="admission-number"
                    type="text"
                    placeholder="ADM2026001"
                    autoCapitalize="characters"
                    value={studentLogin.admissionNumber}
                    onChange={(e) => setStudentLogin({ ...studentLogin, admissionNumber: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <Input
                    id="student-password"
                    type="password"
                    value={studentLogin.password}
                    onChange={(e) => setStudentLogin({ ...studentLogin, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Contact the school administrator if you need access
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
