import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Upload, Shield } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { AssetFormDialog } from "@/components/asset-form-dialog";
import { AssetImportDialog } from "@/components/asset-import-dialog";

export default function AssetsList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ["/api/assets", { search: searchTerm, type: typeFilter, page, pageSize }],
  });

  const assets = assetsData?.assets || [];
  const total = assetsData?.total || 0;

  const downloadTemplate = (format: "csv" | "json") => {
    const template = [
      {
        name: "Example Web Server",
        type: "HW",
        ip: "192.168.1.100",
        hostname: "web-server-01.local",
        owner: "IT Department",
        businessUnit: "Operations",
        criticality: 4,
        dataSensitivity: "High",
        description: "Primary web server hosting customer portal",
      },
    ];

    if (format === "csv") {
      const headers = [
        "name",
        "type",
        "ip",
        "hostname",
        "owner",
        "businessUnit",
        "criticality",
        "dataSensitivity",
        "description",
      ];
      const csvContent = [
        headers.join(","),
        template
          .map((asset) =>
            headers
              .map((header) => {
                const value = asset[header as keyof typeof asset];
                return typeof value === "string" && value.includes(",")
                  ? `"${value}"`
                  : value;
              })
              .join(",")
          )
          .join("\n"),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "asset-import-template.csv";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(template, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "asset-import-template.json";
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      className: "font-medium",
    },
    {
      key: "type",
      header: "Type",
      render: (value: string) => (
        <Badge variant="outline" className="font-mono text-xs">
          {value}
        </Badge>
      ),
    },
    {
      key: "ip",
      header: "IP / Hostname",
      render: (value: string, row: any) => (
        <div className="font-mono text-sm">
          {value || row.hostname || <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (value: string) => value || <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "businessUnit",
      header: "Business Unit",
      render: (value: string) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "criticality",
      header: "Criticality",
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-sm ${
                  i < value
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "riskScore",
      header: "Risk Score",
      className: "text-right",
      render: (value: number) => {
        if (!value) return <span className="text-muted-foreground">—</span>;
        const severity = value >= 20 ? 5 : value >= 15 ? 4 : value >= 10 ? 3 : value >= 5 ? 2 : 1;
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="font-bold text-lg">{value}</span>
            <SeverityBadge severity={severity} showIcon={false} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Assets</h1>
          <p className="text-muted-foreground">
            Manage and monitor your organization's IT assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => downloadTemplate("csv")}
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
            data-testid="button-import-assets"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Assets
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-asset"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
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
                placeholder="Search assets by name, IP, or hostname..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-assets"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="HW">Hardware</SelectItem>
              <SelectItem value="SW">Software</SelectItem>
              <SelectItem value="Data">Data</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={assets}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/assets/${row.id}`)}
        emptyMessage="No assets found. Import assets or add manually to get started."
        emptyIcon={<Shield className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Dialogs */}
      <AssetFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => setPage(1)}
      />
      <AssetImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}
