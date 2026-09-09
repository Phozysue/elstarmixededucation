import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number | null;
  avatar_url: string | null;
  is_featured: boolean | null;
}

const emptyForm = {
  name: "",
  role: "",
  content: "",
  rating: 5,
  avatar_url: "",
  is_featured: true,
};

const TestimonialsManagement = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name,
      role: t.role,
      content: t.content,
      rating: t.rating ?? 5,
      avatar_url: t.avatar_url ?? "",
      is_featured: t.is_featured ?? false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.content.trim()) {
      toast.error("Name, role and story are required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      content: form.content.trim(),
      rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
      avatar_url: form.avatar_url.trim() || null,
      is_featured: form.is_featured,
    };
    const { error } = editing
      ? await supabase.from("testimonials").update(payload).eq("id", editing.id)
      : await supabase.from("testimonials").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Story updated" : "Story added");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Story deleted");
      load();
    }
  };

  const toggleFeatured = async (t: Testimonial) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ is_featured: !t.is_featured })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Student Stories</CardTitle>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Story
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">No stories yet. Add the first one.</p>
        ) : (
          items.map((t) => (
            <div
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-lg border p-4"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={t.avatar_url || undefined} />
                <AvatarFallback>{t.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-sm text-muted-foreground">{t.role}</span>
                  {t.is_featured && <Badge variant="secondary">Featured</Badge>}
                </div>
                <div className="flex gap-0.5 my-1">
                  {Array.from({ length: t.rating ?? 0 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{t.content}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!t.is_featured}
                  onCheckedChange={() => toggleFeatured(t)}
                  aria-label="Featured"
                />
                <Button variant="outline" size="icon" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Story" : "Add Story"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ts-name">Name</Label>
              <Input
                id="ts-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Wanjiru"
              />
            </div>
            <div>
              <Label htmlFor="ts-role">Role</Label>
              <Input
                id="ts-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Form 4 Student / Parent"
              />
            </div>
            <div>
              <Label htmlFor="ts-content">Story</Label>
              <Textarea
                id="ts-content"
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ts-rating">Rating (1-5)</Label>
              <Input
                id="ts-rating"
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="ts-avatar">Photo URL (optional)</Label>
              <Input
                id="ts-avatar"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ts-featured"
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
              />
              <Label htmlFor="ts-featured">Show on home page</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TestimonialsManagement;
