import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

const StudentFees = ({ studentId }: { studentId: string }) => {
  const [fee, setFee] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from("student_fees").select("*").eq("student_id", studentId).maybeSingle(),
        supabase.from("fee_payments").select("*").eq("student_id", studentId).order("paid_on", { ascending: false }),
      ]);
      setFee(f);
      setPayments(p ?? []);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const due = Number(fee?.total_due ?? 0);
  const paid = Number(fee?.total_paid ?? 0);
  const balance = due - paid;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{due.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{paid.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Balance</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${balance > 0 ? "text-destructive" : "text-primary"}`}>{balance.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment History</CardTitle>
          <CardDescription>{fee?.academic_year ? `Academic year ${fee.academic_year}` : "No fee record yet"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead>Note</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
                  : payments.length === 0 ? <TableRow><TableCell colSpan={5}>No payments recorded yet</TableCell></TableRow>
                  : payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.paid_on}</TableCell>
                      <TableCell className="font-medium">{Number(p.amount).toFixed(2)}</TableCell>
                      <TableCell>{p.method ?? "—"}</TableCell>
                      <TableCell>{p.reference ?? "—"}</TableCell>
                      <TableCell>{p.note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentFees;
