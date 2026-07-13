import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DollarSign, Plus, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StudentRow {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string | null;
  academic_year: string;
  total_due: number;
  total_paid: number;
  balance: number;
  feeId: string | null;
}

const FeesManagement = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [form, setForm] = useState({ total_due: "", academic_year: "", notes: "" });
  const [payment, setPayment] = useState({ amount: "", method: "cash", reference: "", note: "", paid_on: new Date().toISOString().slice(0, 10) });
  const [history, setHistory] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: students }, { data: fees }, { data: classes }] = await Promise.all([
      supabase.from("students").select("id, student_id, user_id, class_id"),
      supabase.from("student_fees").select("*"),
      supabase.from("classes").select("id, name"),
    ]);
    const userIds = (students ?? []).map((s: any) => s.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
    const classMap = new Map((classes ?? []).map((c: any) => [c.id, c.name]));
    const feeMap = new Map((fees ?? []).map((f: any) => [f.student_id, f]));

    const out: StudentRow[] = (students ?? []).map((s: any) => {
      const f = feeMap.get(s.id);
      const due = Number(f?.total_due ?? 0);
      const paid = Number(f?.total_paid ?? 0);
      return {
        id: s.id,
        student_id: s.student_id,
        full_name: profileMap.get(s.user_id) ?? "—",
        class_name: classMap.get(s.class_id) ?? null,
        academic_year: f?.academic_year ?? "",
        total_due: due,
        total_paid: paid,
        balance: due - paid,
        feeId: f?.id ?? null,
      };
    });
    setRows(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      r.student_id.toLowerCase().includes(q) ||
      (r.class_name ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openEdit = (r: StudentRow) => {
    setSelected(r);
    setForm({
      total_due: String(r.total_due || ""),
      academic_year: r.academic_year || new Date().getFullYear().toString(),
      notes: "",
    });
    setEditOpen(true);
  };

  const openPay = async (r: StudentRow) => {
    setSelected(r);
    setPayment({ amount: "", method: "cash", reference: "", note: "", paid_on: new Date().toISOString().slice(0, 10) });
    const { data } = await supabase.from("fee_payments").select("*").eq("student_id", r.id).order("paid_on", { ascending: false });
    setHistory(data ?? []);
    setPayOpen(true);
  };

  const saveFee = async () => {
    if (!selected) return;
    const due = parseFloat(form.total_due);
    if (isNaN(due) || due < 0) return toast.error("Enter a valid amount");
    const payload = {
      student_id: selected.id,
      academic_year: form.academic_year || new Date().getFullYear().toString(),
      total_due: due,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("student_fees").upsert(payload, { onConflict: "student_id" });
    if (error) return toast.error(error.message);
    toast.success("Fees updated");
    setEditOpen(false);
    load();
  };

  const addPayment = async () => {
    if (!selected) return;
    const amt = parseFloat(payment.amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Enter a valid amount");
    // ensure fee row exists
    if (!selected.feeId) {
      await supabase.from("student_fees").upsert({
        student_id: selected.id,
        academic_year: new Date().getFullYear().toString(),
        total_due: 0,
      }, { onConflict: "student_id" });
    }
    const { error } = await supabase.from("fee_payments").insert({
      student_id: selected.id,
      amount: amt,
      method: payment.method || null,
      reference: payment.reference || null,
      note: payment.note || null,
      paid_on: payment.paid_on,
      recorded_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    setPayment({ ...payment, amount: "", reference: "", note: "" });
    const { data } = await supabase.from("fee_payments").select("*").eq("student_id", selected.id).order("paid_on", { ascending: false });
    setHistory(data ?? []);
    load();
  };

  const deletePayment = async (id: string) => {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("fee_payments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment removed");
    if (selected) {
      const { data } = await supabase.from("fee_payments").select("*").eq("student_id", selected.id).order("paid_on", { ascending: false });
      setHistory(data ?? []);
    }
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees Management</CardTitle>
        <CardDescription>Set fees due and record payments per student.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search by name, student ID or class..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7}>No students found</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.full_name}</TableCell>
                  <TableCell>{r.student_id}</TableCell>
                  <TableCell>{r.class_name ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.total_due.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{r.total_paid.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.balance > 0 ? "text-destructive" : "text-primary"}`}>{r.balance.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-3 w-3 mr-1" />Fees</Button>
                    <Button size="sm" onClick={() => openPay(r)}><Plus className="h-3 w-3 mr-1" />Payment</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Fees – {selected?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Academic Year</Label><Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2026" /></div>
            <div><Label>Total Due</Label><Input type="number" step="0.01" value={form.total_due} onChange={e => setForm({ ...form, total_due: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveFee}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment – {selected?.full_name}</DialogTitle>
            <CardDescription>Balance: {selected ? (selected.balance).toFixed(2) : ""}</CardDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={payment.paid_on} onChange={e => setPayment({ ...payment, paid_on: e.target.value })} /></div>
            <div><Label>Method</Label><Input value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} placeholder="cash / mpesa / bank" /></div>
            <div><Label>Reference</Label><Input value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} /></div>
            <div className="col-span-2"><Label>Note</Label><Input value={payment.note} onChange={e => setPayment({ ...payment, note: e.target.value })} /></div>
          </div>
          <div className="flex justify-end"><Button onClick={addPayment}>Add Payment</Button></div>
          <div>
            <h4 className="font-semibold mb-2">History</h4>
            <div className="max-h-60 overflow-y-auto rounded border">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Ref</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.length === 0 ? <TableRow><TableCell colSpan={5}>No payments</TableCell></TableRow> : history.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.paid_on}</TableCell>
                      <TableCell>{Number(p.amount).toFixed(2)}</TableCell>
                      <TableCell>{p.method ?? "—"}</TableCell>
                      <TableCell>{p.reference ?? "—"}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => deletePayment(p.id)}>Delete</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FeesManagement;
