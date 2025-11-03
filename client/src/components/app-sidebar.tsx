import {
  Shield,
  LayoutDashboard,
  Search,
  Eye,
  AlertTriangle,
  FileText,
  Activity,
  Archive,
  CheckCircle,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Identify",
    items: [
      {
        title: "Assets",
        url: "/assets",
        icon: Search,
      },
      {
        title: "Asset Discovery",
        url: "/asset-discovery",
        icon: Activity,
      },
    ],
  },
  {
    title: "Protect",
    items: [
      {
        title: "Controls",
        url: "/controls",
        icon: Shield,
      },
      {
        title: "Policies",
        url: "/policies",
        icon: FileText,
      },
      {
        title: "Coverage",
        url: "/coverage",
        icon: CheckCircle,
      },
    ],
  },
  {
    title: "Detect",
    items: [
      {
        title: "Detections",
        url: "/detections",
        icon: Eye,
      },
      {
        title: "Intel Events",
        url: "/intel-events",
        icon: Activity,
      },
      {
        title: "OSINT Feeds",
        url: "/osint-feeds",
        icon: Search,
      },
    ],
  },
  {
    title: "Respond",
    items: [
      {
        title: "Incidents",
        url: "/incidents",
        icon: AlertTriangle,
      },
      {
        title: "Playbooks",
        url: "/playbooks",
        icon: FileText,
      },
      {
        title: "Evidence",
        url: "/evidence",
        icon: Archive,
      },
    ],
  },
  {
    title: "Recover",
    items: [
      {
        title: "Backup Status",
        url: "/backup-status",
        icon: Archive,
      },
      {
        title: "DR Plans",
        url: "/dr-plans",
        icon: FileText,
      },
    ],
  },
  {
    title: "Govern",
    items: [
      {
        title: "Risk Register",
        url: "/risk-register",
        icon: AlertTriangle,
      },
      {
        title: "Compliance",
        url: "/compliance",
        icon: CheckCircle,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">SMB Security</h2>
            <p className="text-xs text-muted-foreground">NIST CSF Platform</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationItems.map((section, idx) => (
          <SidebarGroup key={idx}>
            {section.items ? (
              <>
                <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            ) : (
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === section.url}
                      data-testid={`nav-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={section.url!}>
                        <section.icon className="h-4 w-4" />
                        <span>{section.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-testid="nav-settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
