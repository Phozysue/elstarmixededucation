import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";
import { CheckCircle2, Clock, GraduationCap, Users, Wallet, TrendingUp, FileDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { exportPdfReport } from "@/lib/exportPdf";

const PrincipalDashboard = () => {
  const [busy, setBusy] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, feeCollected: 0, feeExpected: 0 });
  const [pendingExams, setPendingExams] = useState<any[]>([]);
  const [classAverages, setClassAverages] = useState<any[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<any[]>([]);

  const load = async () => {
    setBusy(true);
    const [s, t, c, sf, exams, results] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id, name", { count: "exact" }),
      supabase.from("student_fees").select("total_due,total_paid"),
      supabase.from("exams").select("*, classes(name)").in("status", ["submitted", "approved"]).order("created_at", { ascending: false }),
      supabase.from("exam_results").select("marks_obtained,max_marks,subject_id,subjects(name),exams(class_id,classes(name))"),
    ]);
    const totals = (sf.data ?? []).reduce((acc: any, r: any) => {
      acc.due += Number(r.total_due ?? 0); acc.paid += Number(r.total_paid ?? 0); return acc;
    }, { due: 0, paid: 0 });
    setStats({
      students: s.count ?? 0, teachers: t.count ?? 0, classes: c.count ?? 0,
      feeCollected: totals.paid, feeExpected: totals.due,
    });
    setPendingExams(exams.data ?? []);

    const byClass: Record<string, { total: number; n: number }> = {};
    const bySubject: Record<string, { total: number; n: number }> = {};
    (results.data ?? []).forEach((r: any) => {
      const pct = r.max_marks ? (Number(r.marks_obtained) / Number(r.max_marks)) * 100 : 0;
      const cName = r.exams?.classes?.name ?? "Unknown";
      const sName = r.subjects?.name ?? "Unknown";
      byClass[cName] = { total: (byClass[cName]?.total ?? 0) + pct, n: (byClass[cName]?.n ?? 0) + 1 };
      bySubject[sName] = { total: (bySubject[sName]?.total ?? 0) + pct, n: (bySubject[sName]?.n ?? 0) + 1 };
    });
    setClassAverages(Object.entries(byClass).map(([name, v]) => ({ name, avg: +(v.total / v.n).toFixed(1) })));
    setSubjectAverages(Object.entries(bySubject).map(([name, v]) => ({ name, avg: +(v.total / v.n).toFixed(1) })));
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const setExamStatus = async (id: string, status: "approved" | "published" | "draft") => {
    const { error } = await supabase.from("exams").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Exam ${status}`);
    load();
  };

  const downloadReport = () => {
    exportPdfReport({
      title: "School Performance Report",
      subtitle: new Date().toLocaleDateString(),
      filename: `principal-report-${Date.now()}.pdf`,
      sections: [
        { heading: "Key Metrics", columns: ["Metric", "Value"], rows: [
          ["Students", stats.students], ["Teachers", stats.teachers], ["Classes", stats.classes],
          ["Fees Expected", `KES ${stats.feeExpected.toLocaleString()}`],
          ["Fees Collected", `KES ${stats.feeCollected.toLocaleString()}`],
          ["Collection %", stats.feeExpected ? `${((stats.feeCollected / stats.feeExpected) * 100).toFixed(1)}%` : "-"],
        ]},
        { heading: "Class Averages", columns: ["Class", "Average %"], rows: classAverages.map(c => [c.name, c.avg]) },
        { heading: "Subject Averages", columns: ["Subject", "Average %"], rows: subjectAverages.map(s => [s.name, s.avg]) },
      ],
    });
  };

  if (busy) return <LoadingScreen message="Loading principal dashboard..." />;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-3xl">Principal Dashboard</CardTitle>
            <CardDescription>School-wide oversight, approvals and analytics</CardDescription>
          </div>
          <Button onClick={downloadReport}><FileDown className="h-4 w-4 mr-2" />PDF Report</Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Stat icon={<Users />} label="Students" value={stats.students} />
        <Stat icon={<GraduationCap />} label="Teachers" value={stats.teachers} />
        <Stat icon={<GraduationCap />} label="Classes" value={stats.classes} />
        <Stat icon={<Wallet />} label="Collected" value={`KES ${stats.feeCollected.toLocaleString()}`} />
        <Stat icon={<TrendingUp />} label="Expected" value={`KES ${stats.feeExpected.toLocaleString()}`} />
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approvals ({pendingExams.length})</TabsTrigger>
          <TabsTrigger value="classes">Class Analytics</TabsTrigger>
          <TabsTrigger value="subjects">Subject Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card><CardContent className="pt-6 space-y-3">
            {pendingExams.length === 0 && <p className="text-sm text-muted-foreground">No exams awaiting review.</p>}
            {pendingExams.map(e => (
              <div key={e.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {e.classes?.name} • {e.exam_type} • {e.academic_year} • <span className="uppercase">{e.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {e.status === "submitted" && (
                    <Button size="sm" variant="outline" onClick={() => setExamStatus(e.id, "approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                    </Button>
                  )}
                  {e.status === "approved" && (
                    <Button size="sm" onClick={() => setExamStatus(e.id, "published")}>Publish (locks results)</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setExamStatus(e.id, "draft")}>Return to draft</Button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card><CardContent className="pt-6 h-96">
            {classAverages.length === 0 ? <p className="text-sm text-muted-foreground">No result data yet.</p> :
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAverages}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="avg" fill="hsl(var(--primary))" /></BarChart>
            </ResponsiveContainer>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card><CardContent className="pt-6 h-96">
            {subjectAverages.length === 0 ? <p className="text-sm text-muted-foreground">No result data yet.</p> :
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAverages}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="avg" fill="hsl(var(--primary))" /></BarChart>
            </ResponsiveContainer>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ icon, label, value }: any) => (
  <Card><CardContent className="pt-6">
    <div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm text-muted-foreground">{label}</span></div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </CardContent></Card>
);

export default PrincipalDashboard;
