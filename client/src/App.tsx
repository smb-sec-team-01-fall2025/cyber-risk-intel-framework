import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AssetsList from "@/pages/assets-list";
import AssetDetail from "@/pages/asset-detail";
import DetectionsList from "@/pages/detections-list";
import IncidentsList from "@/pages/incidents-list";
import IncidentDetail from "@/pages/incident-detail";
import ControlsList from "@/pages/controls-list";
import RiskRegister from "@/pages/risk-register";
import Compliance from "@/pages/compliance";
import IntelEvents from "@/pages/intel-events";
import RecoverDashboard from "@/pages/recover-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/assets/:id" component={AssetDetail} />
      <Route path="/assets" component={AssetsList} />
      <Route path="/detections" component={DetectionsList} />
      <Route path="/incidents/:id" component={IncidentDetail} />
      <Route path="/incidents" component={IncidentsList} />
      <Route path="/controls" component={ControlsList} />
      <Route path="/risk-register" component={RiskRegister} />
      <Route path="/compliance" component={Compliance} />
      <Route path="/intel-events" component={IntelEvents} />
      
      {/* Placeholder routes - basic UI ready for backend */}
      <Route path="/asset-discovery" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Asset Discovery (Coming Soon)</h1></div>} />
      <Route path="/policies" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Policies (Coming Soon)</h1></div>} />
      <Route path="/coverage" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Coverage (Coming Soon)</h1></div>} />
      <Route path="/osint-feeds" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">OSINT Feeds (Coming Soon)</h1></div>} />
      <Route path="/playbooks" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Playbooks (Coming Soon)</h1></div>} />
      <Route path="/evidence" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Evidence (Coming Soon)</h1></div>} />
      <Route path="/backup-status" component={RecoverDashboard} />
      <Route path="/dr-plans" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">DR Plans (Coming Soon)</h1></div>} />
      <Route path="/reports" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Reports (Coming Soon)</h1></div>} />
      <Route path="/settings" component={() => <div className="p-8"><h1 className="text-2xl font-semibold">Settings (Coming Soon)</h1></div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-background">
                <div className="flex items-center gap-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div>
                    <h2 className="text-sm font-medium">AI-Augmented Security Platform</h2>
                    <p className="text-xs text-muted-foreground">Powered by NIST CSF 2.0</p>
                  </div>
                </div>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-y-auto p-8 bg-background">
                <div className="max-w-7xl mx-auto">
                  <Router />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
