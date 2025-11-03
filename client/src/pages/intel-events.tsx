import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Activity, RefreshCw } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { formatDistanceToNow } from "date-fns";

export default function IntelEvents() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: intelData, isLoading } = useQuery({
    queryKey: ["/api/intel-events", { search: searchTerm, source: sourceFilter, page, pageSize }],
  });

  const events = intelData?.events || [];
  const total = intelData?.total || 0;

  const columns = [
    {
      key: "indicator",
      header: "Indicator",
      className: "font-mono",
      render: (value: string) => (
        <div className="max-w-xs truncate">{value}</div>
      ),
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
      key: "linkedAssets",
      header: "Linked Assets",
      render: (value: number) => (
        value > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {value} asset{value !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Not linked</span>
        )
      ),
    },
    {
      key: "raw",
      header: "Details",
      render: (value: any) => {
        const tags = value?.tags || [];
        const country = value?.country;
        return (
          <div className="flex items-center gap-1">
            {country && (
              <Badge variant="outline" className="text-xs">
                {country}
              </Badge>
            )}
            {tags.slice(0, 2).map((tag: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{tags.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Discovered",
      className: "text-right",
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(value), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Intel Events</h1>
          <p className="text-muted-foreground">
            Raw threat intelligence from OSINT feeds
          </p>
        </div>
        <Button variant="outline" data-testid="button-sync-feeds">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Feeds
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search intel by indicator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-intel"
              />
            </div>
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-source-filter">
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
              <SelectItem value="misp">MISP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={events}
        isLoading={isLoading}
        emptyMessage="No intel events found. Configure OSINT feeds to start collecting intelligence."
        emptyIcon={<Activity className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
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
