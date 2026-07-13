import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 100;

const AuditLogsViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = (supabase.from("audit_logs" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (userFilter.trim()) query = query.ilike("actor_email", `%${userFilter.trim()}%`);
      if (fromDate) query = query.gte("created_at", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data ?? []) as AuditLog[]);
    } catch (e: any) {
      toast.error("Failed to load audit logs: " + (e.message || "unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distinctActions = useMemo(() => {
    const set = new Set<string>(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const actionVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("deleted") || action.includes("removed")) return "destructive";
    if (action.includes("graded") || action.includes("created") || action.includes("assigned")) return "default";
    if (action.includes("updated")) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle>Audit Logs</CardTitle>
        </div>
        <CardDescription>
          Append-only record of sensitive actions. Logs cannot be edited or deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label htmlFor="action">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger id="action">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {distinctActions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
                {/* common actions even if not yet in the page */}
                {!distinctActions.includes("submission.graded") && (
                  <SelectItem value="submission.graded">submission.graded</SelectItem>
                )}
                {!distinctActions.includes("role.assigned") && (
                  <SelectItem value="role.assigned">role.assigned</SelectItem>
                )}
                {!distinctActions.includes("role.removed") && (
                  <SelectItem value="role.removed">role.removed</SelectItem>
                )}
                {!distinctActions.includes("library_book.created") && (
                  <SelectItem value="library_book.created">library_book.created</SelectItem>
                )}
                {!distinctActions.includes("library_book.deleted") && (
                  <SelectItem value="library_book.deleted">library_book.deleted</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="user">User email contains</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="e.g. teacher@..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Apply
          </Button>
        </div>

        <ScrollArea className="h-[60vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No logs match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.actor_email || (
                        <span className="text-muted-foreground">{log.actor_id.slice(0, 8)}…</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{log.entity_type}</div>
                      {log.entity_id && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {log.entity_id.length > 20 ? `${log.entity_id.slice(0, 8)}…` : log.entity_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <pre className="text-xs bg-muted/50 rounded p-2 max-w-md overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          Showing up to {PAGE_SIZE} most recent entries. Refine filters to narrow results.
        </p>
      </CardContent>
    </Card>
  );
};

export default AuditLogsViewer;
