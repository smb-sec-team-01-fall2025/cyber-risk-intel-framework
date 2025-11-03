import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, Plus, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export default function ControlsList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: controlsData, isLoading } = useQuery({
    queryKey: ["/api/controls", { search: searchTerm, family: familyFilter, function: functionFilter, page, pageSize }],
  });

  const controls = controlsData?.controls || [];
  const total = controlsData?.total || 0;

  const columns = [
    {
      key: "controlId",
      header: "Control ID",
      className: "font-mono font-medium",
    },
    {
      key: "family",
      header: "Family",
      render: (value: string) => (
        <Badge variant="outline" className="text-xs font-mono">
          {value}
        </Badge>
      ),
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
      key: "csfFunction",
      header: "CSF Function",
      render: (value: string) => (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      ),
    },
    {
      key: "implementationStatus",
      header: "Status",
      render: (value: string) => <StatusBadge status={value as any} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (value: number) => (
        <div className="flex items-center gap-2">
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
        </div>
      ),
    },
    {
      key: "sopId",
      header: "SOP",
      render: (value: string) => 
        value ? (
          <Badge variant="outline" className="text-xs">
            SOP Defined
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Security Controls</h1>
          <p className="text-muted-foreground">
            NIST 800-53 R5 controls mapped to CSF 2.0
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-generate-controls">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate Controls
          </Button>
          <Button data-testid="button-add-control">
            <Plus className="h-4 w-4 mr-2" />
            Add Control
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls by ID or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-controls"
              />
            </div>
          </div>
          <Select value={familyFilter} onValueChange={setFamilyFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-family-filter">
              <SelectValue placeholder="Family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Families</SelectItem>
              <SelectItem value="AC">AC - Access Control</SelectItem>
              <SelectItem value="AU">AU - Audit</SelectItem>
              <SelectItem value="AT">AT - Awareness</SelectItem>
              <SelectItem value="CM">CM - Configuration</SelectItem>
              <SelectItem value="IA">IA - Identification</SelectItem>
              <SelectItem value="IR">IR - Incident Response</SelectItem>
              <SelectItem value="SC">SC - System & Comms</SelectItem>
            </SelectContent>
          </Select>
          <Select value={functionFilter} onValueChange={setFunctionFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-function-filter">
              <SelectValue placeholder="CSF Function" />
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
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={controls}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/controls/${row.id}`)}
        emptyMessage="No controls found. Use AI to generate controls based on your assets."
        emptyIcon={<Shield className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
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
