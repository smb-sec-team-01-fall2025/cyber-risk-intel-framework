import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Filter } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { formatDistanceToNow } from "date-fns";

export default function DetectionsList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: detectionsData, isLoading } = useQuery({
    queryKey: ["/api/detections", { search: searchTerm, source: sourceFilter, severity: severityFilter, page, pageSize }],
  });

  const detections = detectionsData?.detections || [];
  const total = detectionsData?.total || 0;

  const columns = [
    {
      key: "indicator",
      header: "Indicator",
      className: "font-mono",
    },
    {
      key: "source",
      header: "Source",
      render: (value: string) => (
        <Badge variant="outline" className="text-xs uppercase">
          {value}
        </Badge>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (value: number) => <SeverityBadge severity={value} />,
    },
    {
      key: "confidence",
      header: "Confidence",
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm font-medium">{value}%</span>
        </div>
      ),
    },
    {
      key: "assetName",
      header: "Asset",
      render: (value: string) => value || <span className="text-muted-foreground">Unknown</span>,
    },
    {
      key: "ttp",
      header: "TTPs",
      render: (value: string[]) => (
        <div className="flex gap-1">
          {value && value.length > 0 ? (
            value.slice(0, 2).map((ttp) => (
              <Badge key={ttp} variant="secondary" className="text-xs font-mono">
                {ttp}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
          {value && value.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "hitCount",
      header: "Hits",
      className: "text-right",
      render: (value: number) => (
        <span className="font-medium">{value || 1}</span>
      ),
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      className: "text-right",
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Threat Detections</h1>
          <p className="text-muted-foreground">
            Real-time detections from OSINT feeds and security tools
          </p>
        </div>
        <Button variant="outline" data-testid="button-configure-feeds">
          <Filter className="h-4 w-4 mr-2" />
          Configure Feeds
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by indicator, asset, or TTP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-detections"
              />
            </div>
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-source-filter">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="shodan">Shodan</SelectItem>
              <SelectItem value="otx">AlienVault OTX</SelectItem>
              <SelectItem value="greynoise">GreyNoise</SelectItem>
              <SelectItem value="abuseipdb">AbuseIPDB</SelectItem>
              <SelectItem value="censys">Censys</SelectItem>
              <SelectItem value="virustotal">VirusTotal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-severity-filter">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="5">Critical</SelectItem>
              <SelectItem value="4">High</SelectItem>
              <SelectItem value="3">Medium</SelectItem>
              <SelectItem value="2">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={detections}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/detections/${row.id}`)}
        emptyMessage="No detections found. Configure OSINT feeds to start monitoring."
        emptyIcon={<Eye className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
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
