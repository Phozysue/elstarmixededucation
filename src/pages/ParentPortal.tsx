import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, UserPlus, Bell, LogIn, LayoutDashboard, Clock, MapPin } from "lucide-react";

interface Term {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
}

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
}

interface ImportantDate {
  id: string;
  label: string;
  deadline_text: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const ParentPortal = () => {
  const { user } = useAuth();
  const [terms, setTerms] = useState<Term[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [dates, setDates] = useState<ImportantDate[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [t, e, d] = await Promise.all([
        supabase.from("academic_terms").select("*").gte("end_date", today).order("start_date").limit(4),
        supabase
          .from("events")
          .select("id,title,description,event_date,location")
          .gte("event_date", new Date().toISOString())
          .order("event_date")
          .limit(6),
        supabase.from("important_dates").select("id,label,deadline_text").eq("is_active", true).order("display_order"),
      ]);
      setTerms(t.data ?? []);
      setEvents(e.data ?? []);
      setDates(d.data ?? []);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="max-w-3xl mb-10">
        <Badge variant="secondary" className="mb-3">For Families</Badge>
        <h1 className="text-4xl font-bold text-foreground mb-3">Parent Portal</h1>
        <p className="text-muted-foreground text-lg">
          Register your child, follow the school calendar, and keep up with news from
          Elstar Mixed Education Centre — all in one place.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button asChild>
            <Link to="/admissions/apply">
              <UserPlus className="h-4 w-4 mr-2" /> Register your child
            </Link>
          </Button>
          {user ? (
            <Button asChild variant="outline">
              <Link to="/parent">
                <LayoutDashboard className="h-4 w-4 mr-2" /> Go to my dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" /> Parent sign in
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card>
          <CardHeader>
            <UserPlus className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Register your child</CardTitle>
            <CardDescription>
              Fill in the admission form once. We review it and contact you with the next steps and
              your portal login details.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CalendarDays className="h-6 w-6 text-primary mb-2" />
            <CardTitle>View the schedule</CardTitle>
            <CardDescription>
              Term dates, exams and school events so you always know what is coming up.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Bell className="h-6 w-6 text-primary mb-2" />
            <CardTitle>Get updates</CardTitle>
            <CardDescription>
              Once signed in you can see your child's attendance, results, fee balance and school
              announcements.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Term schedule
            </CardTitle>
            <CardDescription>Current and upcoming terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {terms.length === 0 ? (
              <p className="text-muted-foreground">Term dates will be published here soon.</p>
            ) : (
              terms.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.academic_year}</div>
                  </div>
                  <div className="text-sm text-right text-muted-foreground">
                    {fmt(t.start_date)} – {fmt(t.end_date)}
                  </div>
                </div>
              ))
            )}
            {dates.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-sm font-semibold">Important dates</div>
                {dates.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span>{d.label}</span>
                    <span className="text-muted-foreground">{d.deadline_text}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Upcoming events
            </CardTitle>
            <CardDescription>What is happening at school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events scheduled right now.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="rounded-lg border p-3">
                  <div className="font-medium">{ev.title}</div>
                  {ev.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(ev.event_date).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {ev.location}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <div className="mt-12 rounded-xl border bg-muted/40 p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">Need help with your account?</h2>
        <p className="text-muted-foreground mb-4">
          Parent logins are created by the school office after your child is admitted.
        </p>
        <Button asChild variant="outline">
          <Link to="/contact">Contact the school</Link>
        </Button>
      </div>
    </div>
  );
};

export default ParentPortal;
