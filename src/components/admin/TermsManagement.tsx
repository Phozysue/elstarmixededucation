import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Term {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
}

const TermsManagement = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academic_terms")
      .select("*")
      .order("academic_year", { ascending: false })
      .order("start_date");
    if (error) toast.error(error.message);
    else setTerms(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (fd: FormData) => {
    const payload = {
      name: fd.get("name") as string,
      academic_year: fd.get("academic_year") as string,
      start_date: fd.get("start_date") as string,
      end_date: fd.get("end_date") as string,
    };
    const { error } = editing
      ? await supabase.from("academic_terms").update(payload).eq("id", editing.id)
      : await supabase.from("academic_terms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Term updated" : "Term created");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this term?")) return;
    const { error } = await supabase.from("academic_terms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Academic Terms</CardTitle>
          <CardDescription>Define Term 1, Term 2 and Term 3 windows. Teachers can only mark attendance and upload report cards within these dates.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Term</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Term" : "New Term"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-4">
              <div>
                <Label>Term *</Label>
                <Select name="name" defaultValue={editing?.name ?? "Term 1"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Academic Year *</Label><Input name="academic_year" defaultValue={editing?.academic_year ?? new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)} required /></div>
              <div><Label>Start Date *</Label><Input type="date" name="start_date" defaultValue={editing?.start_date} required /></div>
              <div><Label>End Date *</Label><Input type="date" name="end_date" defaultValue={editing?.end_date} required /></div>
              <Button type="submit" className="w-full">{editing ? "Save" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No terms defined yet.</TableCell></TableRow>
              ) : terms.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.academic_year}</TableCell>
                  <TableCell>{t.start_date}</TableCell>
                  <TableCell>{t.end_date}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TermsManagement;
