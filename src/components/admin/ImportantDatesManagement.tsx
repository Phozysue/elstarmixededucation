import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface ImportantDate {
  id: string;
  label: string;
  deadline_text: string;
  display_order: number;
  is_active: boolean;
}

const ImportantDatesManagement = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ImportantDate | null>(null);
  const [form, setForm] = useState({ label: "", deadline_text: "", display_order: 0, is_active: true });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("important_dates")
      .select("*")
      .order("display_order");
    if (error) toast.error(error.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ label: "", deadline_text: "", display_order: items.length + 1, is_active: true });
    setOpen(true);
  };

  const openEdit = (it: ImportantDate) => {
    setEditing(it);
    setForm({ label: it.label, deadline_text: it.deadline_text, display_order: it.display_order, is_active: it.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.label.trim() || !form.deadline_text.trim()) {
      toast.error("Label and deadline are required");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("important_dates").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("important_dates").insert({ ...form, created_by: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Created");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("important_dates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Important Dates (Admissions)</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Important Date</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Early Admission" />
              </div>
              <div>
                <Label>Deadline / Description</Label>
                <Input value={form.deadline_text} onChange={(e) => setForm({ ...form, deadline_text: e.target.value })} placeholder="Deadline: December 31" />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active (visible on public page)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading...</p> : items.length === 0 ? <p className="text-muted-foreground">No entries yet.</p> : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="font-semibold">{it.label} {!it.is_active && <span className="text-xs text-muted-foreground">(hidden)</span>}</div>
                  <div className="text-sm text-muted-foreground">{it.deadline_text}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(it)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportantDatesManagement;
