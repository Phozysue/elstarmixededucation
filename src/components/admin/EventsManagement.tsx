import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  created_at: string;
  created_by: string;
}

const EventsManagement = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch events: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async (formData: FormData, isNew: boolean) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error("You must be logged in");
        return;
      }

      const eventDate = formData.get("event_date") as string;
      const endDate = formData.get("end_date") as string;

      const data = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        event_date: new Date(eventDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        location: (formData.get("location") as string) || null,
        created_by: userId,
      };

      if (isNew) {
        const { error } = await supabase.from("events").insert(data);
        if (error) throw error;
        toast.success("Event created successfully");
        setIsAddDialogOpen(false);
      } else if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update({
            title: data.title,
            description: data.description,
            event_date: data.event_date,
            end_date: data.end_date,
            location: data.location,
          })
          .eq("id", editingEvent.id);
        if (error) throw error;
        toast.success("Event updated successfully");
        setIsDialogOpen(false);
        setEditingEvent(null);
      }
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      toast.success("Event deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return dateString;
    }
  };

  const getDateTimeLocalValue = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return "";
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Events Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), true); }} className="space-y-4">
              <div>
                <Label>Event Title *</Label>
                <Input name="title" placeholder="Event title" required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea name="description" placeholder="Event description..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date & Time *</Label>
                  <Input name="event_date" type="datetime-local" required />
                </div>
                <div>
                  <Label>End Date & Time</Label>
                  <Input name="end_date" type="datetime-local" />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input name="location" placeholder="Event location" />
              </div>
              <Button type="submit" className="w-full">Create Event</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No events found. Click "Add Event" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{formatDate(event.event_date)}</div>
                          {event.end_date && (
                            <div className="text-muted-foreground">to {formatDate(event.end_date)}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {event.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingEvent?.id === event.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEvent(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingEvent(event)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Edit Event</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), false); }} className="space-y-4">
                              <div>
                                <Label>Event Title *</Label>
                                <Input name="title" defaultValue={event.title} required />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea name="description" defaultValue={event.description || ""} rows={3} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Start Date & Time *</Label>
                                  <Input 
                                    name="event_date" 
                                    type="datetime-local" 
                                    defaultValue={getDateTimeLocalValue(event.event_date)} 
                                    required 
                                  />
                                </div>
                                <div>
                                  <Label>End Date & Time</Label>
                                  <Input 
                                    name="end_date" 
                                    type="datetime-local" 
                                    defaultValue={getDateTimeLocalValue(event.end_date)} 
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Location</Label>
                                <Input name="location" defaultValue={event.location || ""} />
                              </div>
                              <Button type="submit" className="w-full">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventsManagement;
