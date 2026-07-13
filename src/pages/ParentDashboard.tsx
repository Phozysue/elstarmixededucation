import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingScreen from "@/components/LoadingScreen";
import { Users, GraduationCap, Wallet, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface LinkedChild {
  id: string;
  student_id: string;
  name: string;
  class_name?: string | null;
}

const ParentDashboard = () => {
  const { user, loading } = useAuth();
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [fees, setFees] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: links } = await supabase
        .from("parent_students")
        .select("student_id, students!inner(id, student_id, classes(name), profiles:user_id(full_name))")
        .eq("parent_user_id", user.id);
      const kids: LinkedChild[] = (links ?? []).map((r: any) => ({
        id: r.students.id,
        student_id: r.students.student_id,
        name: r.students.profiles?.full_name ?? r.students.student_id,
        class_name: r.students.classes?.name,
      }));
      setChildren(kids);
      if (kids[0]) setSelectedChild(kids[0].id);
      const { data: an } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setAnnouncements(an ?? []);
      setBusy(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedChild) return;
    (async () => {
      const [r, a, sf, p] = await Promise.all([
        supabase.from("exam_results").select("*, exams(name,status,academic_year), subjects(name,code)").eq("student_id", selectedChild),
        supabase.from("attendance").select("date,status").eq("student_id", selectedChild).order("date", { ascending: false }).limit(60),
        supabase.from("student_fees").select("*").eq("student_id", selectedChild).maybeSingle(),
        supabase.from("fee_payments").select("*").eq("student_id", selectedChild).order("paid_on", { ascending: false }),
      ]);
      setResults(r.data ?? []);
      setAttendance(a.data ?? []);
      setFees(sf.data);
      setPayments(p.data ?? []);
    })();
  }, [selectedChild]);

  if (loading || busy) return <LoadingScreen message="Loading parent dashboard..." />;

  const child = children.find((c) => c.id === selectedChild);
  const outstanding = fees ? Number(fees.total_due ?? 0) - Number(fees.total_paid ?? 0) : 0;
  const presentDays = attendance.filter((a) => a.status === "present").length;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl">Parent Portal</CardTitle>
            <CardDescription>View your child's academics, attendance and fees</CardDescription>
          </div>
          {children.length > 0 && (
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.class_name ?? "no class"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
      </Card>

      {children.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No children linked to your account yet. Please contact the school administrator.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Published Results" value={results.filter(r => r.exams?.status === "published").length} />
            <StatCard icon={<ClipboardCheck className="h-5 w-5" />} label="Attendance (60d)" value={`${presentDays}/${attendance.length || 0}`} />
            <StatCard icon={<Wallet className="h-5 w-5" />} label="Outstanding" value={`KES ${outstanding.toLocaleString()}`} />
            <StatCard icon={<Users className="h-5 w-5" />} label="Class" value={child?.class_name ?? "—"} />
          </div>

          <Tabs defaultValue="results">
            <TabsList>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="results">
              <Card><CardContent className="pt-6">
                <SimpleTable
                  head={["Exam", "Subject", "Marks", "Max", "Grade"]}
                  rows={results
                    .filter(r => r.exams?.status === "published")
                    .map(r => [r.exams?.name, r.subjects?.name, r.marks_obtained, r.max_marks, r.grade ?? "-"])}
                  empty="No published results yet."
                />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="attendance">
              <Card><CardContent className="pt-6">
                <SimpleTable
                  head={["Date", "Status"]}
                  rows={attendance.map(a => [a.date, a.status])}
                  empty="No attendance records."
                />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="fees">
              <Card><CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Info label="Expected" value={`KES ${Number(fees?.total_due ?? 0).toLocaleString()}`} />
                  <Info label="Paid" value={`KES ${Number(fees?.total_paid ?? 0).toLocaleString()}`} />
                  <Info label="Balance" value={`KES ${outstanding.toLocaleString()}`} />
                </div>
                <SimpleTable
                  head={["Date", "Amount", "Method", "Ref"]}
                  rows={payments.map(p => [p.paid_on, `KES ${Number(p.amount).toLocaleString()}`, p.method ?? "-", p.reference ?? "-"])}
                  empty="No payments recorded."
                />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="announcements">
              <Card><CardContent className="pt-6 space-y-3">
                {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements.</p>}
                {announcements.map(a => (
                  <div key={a.id} className="border-l-4 border-primary pl-3 py-1">
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-sm text-muted-foreground">{a.content}</div>
                  </div>
                ))}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }: any) => (
  <Card><CardContent className="pt-6">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  </CardContent></Card>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div><div className="text-muted-foreground">{label}</div><div className="text-lg font-semibold">{value}</div></div>
);

const SimpleTable = ({ head, rows, empty }: { head: string[]; rows: any[][]; empty: string }) => (
  rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> :
  <div className="overflow-auto"><table className="w-full text-sm">
    <thead><tr className="border-b">{head.map(h => <th key={h} className="text-left py-2 px-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-b"><>{r.map((c, j) => <td key={j} className="py-2 px-2">{c ?? "-"}</td>)}</></tr>)}</tbody>
  </table></div>
);

export default ParentDashboard;
