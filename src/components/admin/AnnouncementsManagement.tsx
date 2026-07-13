import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, AlertCircle } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  is_urgent: boolean;
  created_at: string;
  created_by: string;
}

const AUDIENCES = ["all", "students", "teachers", "parents"];

const AnnouncementsManagement = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(["all"]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch announcements: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel("announcements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleAudience = (audience: string) => {
    setSelectedAudiences(prev => 
      prev.includes(audience) 
        ? prev.filter(a => a !== audience)
        : [...prev, audience]
    );
  };

  const handleSave = async (formData: FormData, isNew: boolean) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        toast.error("You must be logged in");
        return;
      }

      const data = {
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        target_audience: selectedAudiences.length > 0 ? selectedAudiences : ["all"],
        is_urgent: formData.get("is_urgent") === "on",
        created_by: userId,
      };

      if (isNew) {
        const { error } = await supabase.from("announcements").insert(data);
        if (error) throw error;
        toast.success("Announcement created successfully");
        setIsAddDialogOpen(false);
        setSelectedAudiences(["all"]);
      } else if (editingAnnouncement) {
        const { error } = await supabase
          .from("announcements")
          .update({
            title: data.title,
            content: data.content,
            target_audience: data.target_audience,
            is_urgent: data.is_urgent,
          })
          .eq("id", editingAnnouncement.id);
        if (error) throw error;
        toast.success("Announcement updated successfully");
        setIsDialogOpen(false);
        setEditingAnnouncement(null);
      }
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Announcement deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setSelectedAudiences(announcement.target_audience);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Announcements Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) setSelectedAudiences(["all"]); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), true); }} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input name="title" placeholder="Announcement title" required />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea name="content" placeholder="Announcement content..." rows={4} required />
              </div>
              <div>
                <Label className="mb-2 block">Target Audience</Label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map(audience => (
                    <label key={audience} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox 
                        checked={selectedAudiences.includes(audience)}
                        onCheckedChange={() => toggleAudience(audience)}
                      />
                      <span className="capitalize">{audience}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox name="is_urgent" id="is_urgent" />
                <Label htmlFor="is_urgent" className="flex items-center gap-1 cursor-pointer">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Mark as Urgent
                </Label>
              </div>
              <Button type="submit" className="w-full">Create Announcement</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No announcements found. Click "Add Announcement" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {announcement.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_audience.map(a => (
                          <Badge key={a} variant="secondary" className="capitalize text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {announcement.is_urgent && (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(announcement.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={isDialogOpen && editingAnnouncement?.id === announcement.id} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingAnnouncement(null); setSelectedAudiences(["all"]); } }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(announcement)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Edit Announcement</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget), false); }} className="space-y-4">
                              <div>
                                <Label>Title *</Label>
                                <Input name="title" defaultValue={announcement.title} required />
                              </div>
                              <div>
                                <Label>Content *</Label>
                                <Textarea name="content" defaultValue={announcement.content} rows={4} required />
                              </div>
                              <div>
                                <Label className="mb-2 block">Target Audience</Label>
                                <div className="flex flex-wrap gap-2">
                                  {AUDIENCES.map(audience => (
                                    <label key={audience} className="flex items-center gap-2 cursor-pointer">
                                      <Checkbox 
                                        checked={selectedAudiences.includes(audience)}
                                        onCheckedChange={() => toggleAudience(audience)}
                                      />
                                      <span className="capitalize">{audience}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox name="is_urgent" id="edit_is_urgent" defaultChecked={announcement.is_urgent} />
                                <Label htmlFor="edit_is_urgent" className="flex items-center gap-1 cursor-pointer">
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                  Mark as Urgent
                                </Label>
                              </div>
                              <Button type="submit" className="w-full">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)}>
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

export default AnnouncementsManagement;
