import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Plus } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";

export default function IncidentsList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ["/api/incidents", { search: searchTerm, status: statusFilter, severity: severityFilter, page, pageSize }],
  });

  const incidents = incidentsData?.incidents || [];
  const total = incidentsData?.total || 0;

  const columns = [
    {
      key: "incidentNumber",
      header: "Incident #",
      className: "font-mono font-medium",
    },
    {
      key: "title",
      header: "Title",
      className: "max-w-md",
      render: (value: string) => (
        <div className="truncate">{value}</div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (value: string) => <SeverityBadge severity={value as any} />,
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => <StatusBadge status={value as any} />,
    },
    {
      key: "owner",
      header: "Owner",
      render: (value: string) => value || <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "openedAt",
      header: "Opened",
      className: "text-right",
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "—"}
        </span>
      ),
    },
    {
      key: "slaBreached",
      header: "SLA",
      render: (value: boolean, row: any) => {
        if (value) {
          return <Badge variant="destructive" className="text-xs">Breached</Badge>;
        }
        if (row.slaDueAt && new Date(row.slaDueAt) < new Date()) {
          return <Badge variant="destructive" className="text-xs">Expired</Badge>;
        }
        if (row.slaDueAt) {
          const hoursLeft = Math.floor((new Date(row.slaDueAt).getTime() - Date.now()) / (1000 * 60 * 60));
          if (hoursLeft < 4) {
            return <Badge variant="outline" className="text-xs text-yellow-600">Soon</Badge>;
          }
          return <Badge variant="outline" className="text-xs">On Track</Badge>;
        }
        return <span className="text-muted-foreground text-sm">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Incident Response</h1>
          <p className="text-muted-foreground">
            Track and manage security incidents with automated playbooks
          </p>
        </div>
        <Button data-testid="button-create-incident" onClick={() => setLocation("/incidents/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Incident
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents by number, title, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-incidents"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Triage">Triage</SelectItem>
              <SelectItem value="Containment">Containment</SelectItem>
              <SelectItem value="Eradication">Eradication</SelectItem>
              <SelectItem value="Recovery">Recovery</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-severity-filter">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="P1">P1 - Critical</SelectItem>
              <SelectItem value="P2">P2 - High</SelectItem>
              <SelectItem value="P3">P3 - Medium</SelectItem>
              <SelectItem value="P4">P4 - Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={incidents}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/incidents/${row.id}`)}
        emptyMessage="No incidents found. Create an incident to track security events."
        emptyIcon={<AlertTriangle className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
