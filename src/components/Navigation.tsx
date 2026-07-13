import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, LogOut, User, Shield, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setUserRole(data?.role || null);
      } catch (error) {
        console.error("Error checking user role:", error);
        setUserRole(null);
      }
    };

    checkUserRole();

    // Subscribe to role changes
    const channel = supabase
      .channel("user-role-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          checkUserRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
  };
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navItems = [{
    path: "/",
    label: "Home"
  }, {
    path: "/about",
    label: "About"
  }, {
    path: "/academics",
    label: "Academics"
  }, {
    path: "/admissions",
    label: "Admissions"
  }, {
    path: "/gallery",
    label: "Gallery"
  }, ...(userRole === "admin" || userRole === "teacher" || userRole === "student" ? [{
    path: "/library",
    label: "Library",
    icon: BookOpen
  }] : []), {
    path: "/news-events",
    label: "News & Events"
  }, {
    path: "/contact",
    label: "Contact"
  }];
  const isActive = (path: string) => location.pathname === path;
  return <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">Elstar mixed Educational Centre</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => <Link key={item.path} to={item.path} className={`text-sm font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </Link>)}
            {userRole === "admin" && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                  isActive("/admin") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            {userRole === "teacher" && (
              <Link
                to="/teacher"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                  isActive("/teacher") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {userRole === "student" && (
              <Link
                to="/student"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                  isActive("/student") ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-foreground" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && <div className="md:hidden py-4 space-y-3 border-t border-border">
            {navItems.map(item => <Link key={item.path} to={item.path} className={`block py-2 text-sm font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"}`} onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>)}
            {userRole === "admin" && (
              <Link
                to="/admin"
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  isActive("/admin") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
            {userRole === "teacher" && (
              <Link
                to="/teacher"
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  isActive("/teacher") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {userRole === "student" && (
              <Link
                to="/student"
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${
                  isActive("/student") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {user ? (
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            ) : (
              <Button variant="default" className="w-full" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>}
      </div>
    </nav>;
};
export default Navigation;