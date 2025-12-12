import {
  Shield,
  LayoutDashboard,
  Search,
  AlertTriangle,
  Activity,
  Archive,
  CheckCircle,
  ClipboardList,
  Gavel,
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
        title: "Risk Register",
        url: "/risk-register",
        icon: AlertTriangle,
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
    ],
  },
  {
    title: "Detect",
    items: [
      {
        title: "Intel Events",
        url: "/intel-events",
        icon: Activity,
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
    ],
  },
  {
    title: "Recover",
    items: [
      {
        title: "Resilience Dashboard",
        url: "/backup-status",
        icon: Archive,
      },
    ],
  },
  {
    title: "Govern",
    items: [
      {
        title: "Governance Dashboard",
        url: "/governance",
        icon: Gavel,
      },
      {
        title: "Compliance Matrix",
        url: "/compliance-matrix",
        icon: CheckCircle,
      },
      {
        title: "POA&M Board",
        url: "/poam",
        icon: ClipboardList,
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
            <p className="text-xs text-muted-foreground">NIST CSF 2.0</p>
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
    </Sidebar>
  );
}
