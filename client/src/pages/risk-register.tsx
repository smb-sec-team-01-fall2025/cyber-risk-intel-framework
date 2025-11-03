import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";

export default function RiskRegister() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: riskStats } = useQuery({
    queryKey: ["/api/risk/stats"],
  });

  const { data: risksData, isLoading } = useQuery({
    queryKey: ["/api/risks", { search: searchTerm, status: statusFilter, page, pageSize }],
  });

  const risks = risksData?.risks || [];
  const total = risksData?.total || 0;

  const getRiskColor = (score: number) => {
    if (score >= 20) return "text-destructive";
    if (score >= 15) return "text-chart-4";
    if (score >= 10) return "text-yellow-600";
    return "text-muted-foreground";
  };

  const columns = [
    {
      key: "title",
      header: "Risk",
      className: "max-w-md font-medium",
      render: (value: string) => (
        <div className="truncate">{value}</div>
      ),
    },
    {
      key: "assetName",
      header: "Asset",
      render: (value: string) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "likelihood",
      header: "Likelihood",
      render: (value: number) => (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-sm ${
                i < value ? "bg-chart-1" : "bg-muted"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "impact",
      header: "Impact",
      render: (value: number) => (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-sm ${
                i < value ? "bg-chart-4" : "bg-muted"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "score",
      header: "Risk Score",
      className: "text-right",
      render: (value: number, row: any) => {
        const severity = value >= 20 ? 5 : value >= 15 ? 4 : value >= 10 ? 3 : value >= 5 ? 2 : 1;
        return (
          <div className="flex items-center justify-end gap-2">
            <span className={`font-bold text-lg ${getRiskColor(value)}`}>{value}</span>
            <SeverityBadge severity={severity} showIcon={false} />
          </div>
        );
      },
    },
    {
      key: "residualRisk",
      header: "Residual",
      className: "text-right",
      render: (value: number) => 
        value ? (
          <span className={`font-medium ${getRiskColor(value)}`}>{value}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Risk Register</h1>
          <p className="text-muted-foreground">
            Track and manage organizational security risks
          </p>
        </div>
        <Button data-testid="button-add-risk">
          <Plus className="h-4 w-4 mr-2" />
          Add Risk
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Risks"
          value={riskStats?.total || 0}
          icon={AlertTriangle}
        />
        <StatCard
          title="Critical Risks"
          value={riskStats?.critical || 0}
          icon={AlertTriangle}
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          title="Open Risks"
          value={riskStats?.open || 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Risk Score"
          value={riskStats?.avgScore?.toFixed(1) || "0.0"}
          icon={TrendingUp}
        />
      </div>

      {/* Risk Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Matrix (5×5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            <div className="col-span-1" />
            <div className="text-center text-xs font-medium text-muted-foreground">1</div>
            <div className="text-center text-xs font-medium text-muted-foreground">2</div>
            <div className="text-center text-xs font-medium text-muted-foreground">3</div>
            <div className="text-center text-xs font-medium text-muted-foreground">4</div>
            <div className="text-center text-xs font-medium text-muted-foreground">5</div>
            
            {[5, 4, 3, 2, 1].map((impact) => (
              <div key={`row-${impact}`} className="contents">
                <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {impact}
                </div>
                {[1, 2, 3, 4, 5].map((likelihood) => {
                  const score = impact * likelihood;
                  const bgColor = 
                    score >= 20 ? "bg-destructive" :
                    score >= 15 ? "bg-chart-4" :
                    score >= 10 ? "bg-yellow-500" :
                    score >= 5 ? "bg-blue-500" :
                    "bg-muted";
                  const textColor = score >= 5 ? "text-white" : "text-muted-foreground";
                  return (
                    <div
                      key={`${impact}-${likelihood}`}
                      className={`aspect-square rounded-md ${bgColor} ${textColor} flex items-center justify-center text-sm font-medium`}
                    >
                      {score}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="col-span-1" />
            <div className="col-span-5 text-center text-xs text-muted-foreground mt-2">
              Likelihood →
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-4">
            ← Impact
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search risks by title or asset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-risks"
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
              <SelectItem value="In-Progress">In Progress</SelectItem>
              <SelectItem value="Mitigated">Mitigated</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={risks}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/risks/${row.id}`)}
        emptyMessage="No risks found. Add risks manually or let AI identify them from your assets."
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
