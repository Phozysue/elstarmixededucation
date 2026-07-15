import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";
import { Wallet, FileDown, Receipt, Search } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { exportReceiptPdf, exportPdfReport } from "@/lib/exportPdf";
import { useAuth } from "@/hooks/useAuth";

const BursarDashboard = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ student_id: "", amount: "", method: "cash", reference: "", note: "" });

  const load = async () => {
    setBusy(true);
    const [st, fe, pay] = await Promise.all([
      supabase.from("students").select("id, student_id, classes(name), profiles:user_id(full_name)"),
      supabase.from("student_fees").select("*"),
      supabase.from("fee_payments").select("*, students!inner(student_id, profiles:user_id(full_name))").order("paid_on", { ascending: false }).limit(200),
    ]);
    setStudents(st.data ?? []);
    setFees(fe.data ?? []);
    setPayments(pay.data ?? []);
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s =>
      !q || s.student_id?.toLowerCase().includes(q) || s.profiles?.full_name?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const feeMap = useMemo(() => {
    const m: Record<string, any> = {};
    fees.forEach(f => { m[f.student_id] = f; });
    return m;
  }, [fees]);

  const totals = useMemo(() => {
    const due = fees.reduce((a, f) => a + Number(f.total_due ?? 0), 0);
    const paid = fees.reduce((a, f) => a + Number(f.total_paid ?? 0), 0);
    return { due, paid, balance: due - paid };
  }, [fees]);

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.amount) return toast.error("Student and amount required");
    const { data, error } = await supabase.from("fee_payments").insert({
      student_id: form.student_id,
      amount: Number(form.amount),
      method: form.method,
      reference: form.reference || null,
      note: form.note || null,
      paid_on: new Date().toISOString().slice(0, 10),
      recorded_by: user?.id,
    }).select("*, students!inner(student_id, profiles:user_id(full_name))").single();
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    const st = students.find(s => s.id === form.student_id);
    exportReceiptPdf({
      schoolName: "Elster Mixed Education Centre",
      receiptNumber: data.id.slice(0, 8).toUpperCase(),
      studentName: st?.profiles?.full_name ?? st?.student_id ?? "-",
      studentCode: st?.student_id ?? "-",
      amount: Number(form.amount),
      method: form.method,
      date: data.paid_on,
      note: form.note,
    });
    setForm({ student_id: "", amount: "", method: "cash", reference: "", note: "" });
    load();
  };

  const exportStatements = () => {
    const rows = filteredStudents.map(s => {
      const f = feeMap[s.id];
      const due = Number(f?.total_due ?? 0), paid = Number(f?.total_paid ?? 0);
      return {
        AdmissionNo: s.student_id, Name: s.profiles?.full_name ?? "-",
        Class: s.classes?.name ?? "-", Expected: due, Paid: paid, Balance: due - paid,
      };
    });
    exportToExcel(rows, `fee-statements-${Date.now()}.xlsx`, "Fees");
  };

  const dailyReport = () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = payments.filter(p => p.paid_on === today);
    exportPdfReport({
      title: "Daily Fee Collection",
      subtitle: today,
      filename: `daily-report-${today}.pdf`,
      sections: [{
        columns: ["Time", "Student", "Amount (KES)", "Method", "Ref"],
        rows: rows.map(p => [
          new Date(p.created_at).toLocaleTimeString(),
          p.students?.profiles?.full_name ?? p.students?.student_id ?? "-",
          Number(p.amount).toLocaleString(), p.method ?? "-", p.reference ?? "-",
        ]),
      }, {
        heading: "Total",
        columns: ["Payments", "Total (KES)"],
        rows: [[rows.length, rows.reduce((a, p) => a + Number(p.amount), 0).toLocaleString()]],
      }],
    });
  };

  if (busy) return <LoadingScreen message="Loading bursar dashboard..." />;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6"><CardHeader>
        <CardTitle className="text-3xl">Bursar / Accounts</CardTitle>
        <CardDescription>Record payments, manage fees and generate financial reports</CardDescription>
      </CardHeader></Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Expected" value={`KES ${totals.due.toLocaleString()}`} />
        <Stat label="Collected" value={`KES ${totals.paid.toLocaleString()}`} />
        <Stat label="Outstanding" value={`KES ${totals.balance.toLocaleString()}`} />
      </div>

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">Record Payment</TabsTrigger>
          <TabsTrigger value="statements">Fee Statements</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <Card><CardContent className="pt-6">
            <form onSubmit={recordPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.student_id} — {s.profiles?.full_name ?? "?"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount (KES)</Label><Input type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div>
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem><SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem><SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Note</Label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit"><Receipt className="h-4 w-4 mr-2" />Record & Print Receipt</Button>
              </div>
            </form>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="statements">
          <Card><CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name / admission no." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
              <div className="flex-1" />
              <Button variant="outline" onClick={exportStatements}><FileDown className="h-4 w-4 mr-2" />Excel</Button>
            </div>
            <div className="overflow-auto"><table className="w-full text-sm">
              <thead><tr className="border-b">{["Adm.", "Name", "Class", "Expected", "Paid", "Balance"].map(h => <th key={h} className="text-left py-2 px-2">{h}</th>)}</tr></thead>
              <tbody>{filteredStudents.map(s => {
                const f = feeMap[s.id]; const due = Number(f?.total_due ?? 0), paid = Number(f?.total_paid ?? 0);
                return <tr key={s.id} className="border-b">
                  <td className="py-2 px-2">{s.student_id}</td>
                  <td className="py-2 px-2">{s.profiles?.full_name ?? "-"}</td>
                  <td className="py-2 px-2">{s.classes?.name ?? "-"}</td>
                  <td className="py-2 px-2">{due.toLocaleString()}</td>
                  <td className="py-2 px-2">{paid.toLocaleString()}</td>
                  <td className={`py-2 px-2 font-semibold ${due - paid > 0 ? "text-destructive" : "text-green-600"}`}>{(due - paid).toLocaleString()}</td>
                </tr>;
              })}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardContent className="pt-6 space-y-3">
            <div className="flex justify-end"><Button variant="outline" onClick={dailyReport}><FileDown className="h-4 w-4 mr-2" />Today's Report (PDF)</Button></div>
            <div className="overflow-auto"><table className="w-full text-sm">
              <thead><tr className="border-b">{["Date", "Student", "Amount", "Method", "Ref"].map(h => <th key={h} className="text-left py-2 px-2">{h}</th>)}</tr></thead>
              <tbody>{payments.map(p => <tr key={p.id} className="border-b">
                <td className="py-2 px-2">{p.paid_on}</td>
                <td className="py-2 px-2">{p.students?.profiles?.full_name ?? p.students?.student_id ?? "-"}</td>
                <td className="py-2 px-2">KES {Number(p.amount).toLocaleString()}</td>
                <td className="py-2 px-2">{p.method ?? "-"}</td>
                <td className="py-2 px-2">{p.reference ?? "-"}</td>
              </tr>)}</tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <Card><CardContent className="pt-6">
    <div className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </CardContent></Card>
);

export default BursarDashboard;
