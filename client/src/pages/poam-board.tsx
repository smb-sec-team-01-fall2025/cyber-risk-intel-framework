import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Search, FileText, Plus, AlertTriangle, Clock, User,
  Calendar, CheckCircle, XCircle, Loader2
} from "lucide-react";

interface PoamItem {
  id: string;
  title: string;
  description: string | null;
  driver: string;
  severity: number;
  owner: string | null;
  dueDate: string | null;
  status: string;
  linkedAssertionId: string | null;
  linkedRiskItemId: string | null;
  linkedControlId: string | null;
  remediation: string | null;
  completedAt: string | null;
  createdAt: string;
}

const driverLabels: Record<string, string> = {
  coverage_gap: "Coverage Gap",
  stale_evidence: "Stale Evidence",
  sla_breach: "SLA Breach",
  rpo_rto_gap: "RPO/RTO Gap",
  control_missing: "Missing Control",
  kpi_below_target: "KPI Below Target",
};

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Open: "destructive",
  "In-Progress": "secondary",
  Completed: "default",
  Deferred: "outline",
};

export default function PoamBoard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedItem, setSelectedItem] = useState<PoamItem | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{ items: PoamItem[]; total: number }>({
    queryKey: ["/api/poam", { status: statusFilter, driver: driverFilter, page, pageSize }],
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/poam/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/poam"] });
      queryClient.invalidateQueries({ queryKey: ["/api/govern/summary"] });
      toast({
        title: "Status updated",
        description: "POA&M item status has been updated",
      });
      setDetailDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(search) ||
      (item.description?.toLowerCase() || "").includes(search) ||
      (item.owner?.toLowerCase() || "").includes(search)
    );
  });

  const columns = [
    {
      key: "severity",
      label: "Sev",
      render: (value: number) => {
        const colors = ["bg-blue-500", "bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-destructive"];
        return (
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${colors[value - 1]}`}>
            {value}
          </div>
        );
      },
    },
    {
      key: "title",
      label: "Title",
      render: (value: string, row: PoamItem) => (
        <div className="max-w-md">
          <span className="font-medium">{value}</span>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "driver",
      label: "Driver",
      render: (value: string) => (
        <Badge variant="outline">{driverLabels[value] || value}</Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={statusColors[value] || "outline"}>{value}</Badge>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      render: (value: string | null) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" />
          {value || "Unassigned"}
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (value: string | null, row: PoamItem) => {
        if (!value) return <span className="text-muted-foreground">Not set</span>;
        const date = new Date(value);
        const isOverdue = date < new Date() && row.status !== "Completed";
        return (
          <div className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
            <Calendar className="h-3 w-3" />
            {date.toLocaleDateString()}
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Status counts for summary
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleRowClick = (row: PoamItem) => {
    setSelectedItem(row);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">POA&M Board</h1>
          <p className="text-muted-foreground">
            Plan of Action & Milestones tracking
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {["Open", "In-Progress", "Completed", "Deferred"].map((status) => (
          <Card
            key={status}
            className={`cursor-pointer transition-colors ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </div>
                <Badge variant={statusColors[status]}>{status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search POA&M items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In-Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-driver">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                <SelectItem value="coverage_gap">Coverage Gap</SelectItem>
                <SelectItem value="stale_evidence">Stale Evidence</SelectItem>
                <SelectItem value="sla_breach">SLA Breach</SelectItem>
                <SelectItem value="rpo_rto_gap">RPO/RTO Gap</SelectItem>
                <SelectItem value="control_missing">Missing Control</SelectItem>
                <SelectItem value="kpi_below_target">KPI Below Target</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          emptyMessage="No POA&M items found. Run the Govern Agent to identify gaps and generate POA&M items."
          emptyIcon={<FileText className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusColors[selectedItem.status]}>{selectedItem.status}</Badge>
                <Badge variant="outline">{driverLabels[selectedItem.driver]}</Badge>
                <Badge variant="outline">Severity: {selectedItem.severity}</Badge>
              </div>
              
              {selectedItem.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Owner:</span>{" "}
                  {selectedItem.owner || "Unassigned"}
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>{" "}
                  {selectedItem.dueDate ? new Date(selectedItem.dueDate).toLocaleDateString() : "Not set"}
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {new Date(selectedItem.createdAt).toLocaleDateString()}
                </div>
                {selectedItem.completedAt && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>{" "}
                    {new Date(selectedItem.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {selectedItem.remediation && (
                <div>
                  <h4 className="font-medium mb-1">Remediation Plan</h4>
                  <Textarea value={selectedItem.remediation} readOnly className="min-h-[100px]" />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedItem.status === "Open" && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ id: selectedItem.id, status: "In-Progress" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Start Work
                  </Button>
                )}
                {selectedItem.status === "In-Progress" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ id: selectedItem.id, status: "Deferred" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Defer
                    </Button>
                    <Button
                      onClick={() => updateStatusMutation.mutate({ id: selectedItem.id, status: "Completed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Mark Complete
                    </Button>
                  </>
                )}
                {(selectedItem.status === "Completed" || selectedItem.status === "Deferred") && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: selectedItem.id, status: "Open" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
