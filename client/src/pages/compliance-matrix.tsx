import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { Search, Shield, CheckCircle, AlertTriangle, Clock, User } from "lucide-react";

interface ComplianceAssertion {
  id: string;
  csfFunction: string;
  category: string;
  subcategory: string;
  status: string;
  owner: string | null;
  lastVerifiedAt: string | null;
  nextReviewDue: string | null;
  notes: string | null;
}

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Implemented: "default",
  PartiallyImplemented: "secondary",
  Planned: "outline",
  NotAssessed: "destructive",
  NotApplicable: "outline",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  Implemented: CheckCircle,
  PartiallyImplemented: AlertTriangle,
  Planned: Clock,
  NotAssessed: AlertTriangle,
  NotApplicable: Shield,
};

export default function ComplianceMatrix() {
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showStale, setShowStale] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useQuery<{ assertions: ComplianceAssertion[]; total: number }>({
    queryKey: ["/api/compliance/assertions", { function: functionFilter, status: statusFilter, stale: showStale, page, pageSize }],
  });

  const assertions = data?.assertions || [];
  const total = data?.total || 0;

  const filteredAssertions = assertions.filter((a) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      a.subcategory.toLowerCase().includes(search) ||
      a.category.toLowerCase().includes(search) ||
      (a.owner?.toLowerCase() || "").includes(search)
    );
  });

  const columns = [
    {
      key: "csfFunction",
      label: "Function",
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: "subcategory",
      label: "Subcategory",
      render: (value: string, row: ComplianceAssertion) => (
        <div>
          <span className="font-medium">{value}</span>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => {
        const Icon = statusIcons[value] || Shield;
        return (
          <Badge variant={statusColors[value] || "outline"} className="gap-1">
            <Icon className="h-3 w-3" />
            {value === "PartiallyImplemented" ? "Partial" : value === "NotAssessed" ? "Not Assessed" : value}
          </Badge>
        );
      },
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
      key: "lastVerifiedAt",
      label: "Last Verified",
      render: (value: string | null) => {
        if (!value) return <span className="text-muted-foreground">Never</span>;
        const date = new Date(value);
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        const isStale = daysAgo > 90;
        return (
          <span className={isStale ? "text-destructive" : ""}>
            {date.toLocaleDateString()}
            {isStale && <span className="ml-1 text-xs">(stale)</span>}
          </span>
        );
      },
    },
    {
      key: "nextReviewDue",
      label: "Next Review",
      render: (value: string | null) => {
        if (!value) return <span className="text-muted-foreground">Not set</span>;
        const date = new Date(value);
        const isOverdue = date < new Date();
        return (
          <span className={isOverdue ? "text-destructive" : ""}>
            {date.toLocaleDateString()}
            {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
          </span>
        );
      },
    },
  ];

  // Group by function for summary
  const functionCounts = assertions.reduce((acc, a) => {
    acc[a.csfFunction] = (acc[a.csfFunction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium">Compliance Matrix</h1>
        <p className="text-muted-foreground">
          CSF 2.0 subcategory compliance status and evidence tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        {["Identify", "Protect", "Detect", "Respond", "Recover", "Govern"].map((func) => (
          <Card
            key={func}
            className={`cursor-pointer transition-colors ${functionFilter === func ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFunctionFilter(functionFilter === func ? "all" : func)}
          >
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{functionCounts[func] || 0}</div>
              <p className="text-xs text-muted-foreground">{func}</p>
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
                  placeholder="Search subcategories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-function">
                <SelectValue placeholder="Function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Functions</SelectItem>
                <SelectItem value="Identify">Identify</SelectItem>
                <SelectItem value="Protect">Protect</SelectItem>
                <SelectItem value="Detect">Detect</SelectItem>
                <SelectItem value="Respond">Respond</SelectItem>
                <SelectItem value="Recover">Recover</SelectItem>
                <SelectItem value="Govern">Govern</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Implemented">Implemented</SelectItem>
                <SelectItem value="PartiallyImplemented">Partially Implemented</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="NotAssessed">Not Assessed</SelectItem>
                <SelectItem value="NotApplicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showStale ? "default" : "outline"}
              onClick={() => setShowStale(!showStale)}
              data-testid="button-stale-filter"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Stale Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAssertions}
          isLoading={isLoading}
          emptyMessage="No compliance assertions found. Run the Govern Agent to generate assertions."
          emptyIcon={<Shield className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
