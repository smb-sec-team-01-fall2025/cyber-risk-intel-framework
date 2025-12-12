import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Activity, RefreshCw } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { formatDistanceToNow } from "date-fns";

export default function IntelEvents() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: intelData, isLoading } = useQuery<{
    events: any[];
    total: number;
    page: number;
    pageSize: number;
  }>({
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
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <SeverityBadge severity={value as 1 | 2 | 3 | 4 | 5} />
          <span className="text-xs text-muted-foreground font-mono">{value}/5</span>
        </div>
      ),
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
        onRowClick={(row) => setSelectedEvent(row)}
        emptyMessage="No intel events found. Configure OSINT feeds to start collecting intelligence."
        emptyIcon={<Activity className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Intel Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about this threat intelligence event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Indicator</label>
                <p className="font-mono text-sm mt-1">{selectedEvent.indicator}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <div className="text-sm mt-1"><Badge variant="outline">{selectedEvent.source}</Badge></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <div className="text-sm mt-1"><SeverityBadge severity={selectedEvent.severity} /></div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm mt-1">{selectedEvent.description || "No description available"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Raw Data</label>
                <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-x-auto max-h-64">
                  {JSON.stringify(selectedEvent.raw, null, 2)}
                </pre>
              </div>
              <div>
                <label className="text-sm font-medium">Discovered</label>
                <p className="text-sm mt-1">{formatDistanceToNow(new Date(selectedEvent.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
