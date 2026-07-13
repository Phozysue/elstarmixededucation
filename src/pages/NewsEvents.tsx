import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Newspaper, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_urgent: boolean;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
}

const NewsEvents = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchNewsAndEvents();
  }, []);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminRole();
  }, [user]);

  const fetchNewsAndEvents = async () => {
    try {
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(10);

      if (announcementsData) setAnnouncements(announcementsData);
      if (eventsData) setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching news and events:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-foreground">News & Events</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stay updated with the latest news and upcoming events at Elstar Mixed Educational Centre.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest News */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Newspaper className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">Latest News</h2>
              </div>
              {isAdmin && (
                <Button asChild size="sm">
                  <Link to="/admin?tab=announcements">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Link>
                </Button>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading news...</div>
            ) : announcements.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No announcements at this time.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        {announcement.is_urgent && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(announcement.created_at), "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{announcement.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">Upcoming Events</h2>
              </div>
              {isAdmin && (
                <Button asChild size="sm">
                  <Link to="/admin?tab=events">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Link>
                </Button>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading events...</div>
            ) : events.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No upcoming events scheduled.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(event.event_date), "MMM d, yyyy 'at' h:mm a")}
                            {event.end_date && ` - ${format(new Date(event.end_date), "MMM d, yyyy 'at' h:mm a")}`}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    {event.description && (
                      <CardContent>
                        <p className="text-muted-foreground">{event.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsEvents;
