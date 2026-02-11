import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  LayoutDashboard,
  Users,
  Calendar,
  Bot,
  Mail,
  GraduationCap,
  Settings,
  LogOut,
  Phone,
  MessageSquare,
  Workflow,
  Sparkles,
  Library,
  Wand2,
  Filter,
  Boxes,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const mainNav = [
  { title: "Overview", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Strategy", icon: Sparkles, url: "/dashboard/strategy", badge: "AI" },
  { title: "Leads & CRM", icon: Users, url: "/dashboard/leads" },
  { title: "Sales Funnels", icon: Filter, url: "/dashboard/funnels" },
  { title: "Appointments", icon: Calendar, url: "/dashboard/appointments" },
];

const automationNav = [
  { title: "Agent Catalog", icon: Boxes, url: "/dashboard/agent-catalog", badge: "NEW" },
  { title: "AI Agents", icon: Bot, url: "/dashboard/ai-agents", badge: "LIVE" },
  { title: "Voice AI", icon: Phone, url: "/dashboard/voice-ai", badge: "NEW" },
  { title: "Chatbots", icon: MessageSquare, url: "/dashboard/ai-agents" },
  { title: "Email & SMS", icon: Mail, url: "/dashboard/email" },
];

const growthNav = [
  { title: "Automations", icon: Workflow, url: "/dashboard/automations" },
  { title: "Resources", icon: Library, url: "/dashboard/resources", badge: "NEW" },
  { title: "Demos & Install", icon: Wand2, url: "/dashboard/demos", badge: "NEW" },
  { title: "Training", icon: GraduationCap, url: "/dashboard/training" },
  { title: "Settings", icon: Settings, url: "/dashboard/settings" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: adminData } = useQuery<{ id: string } | null>({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const { data: isOwnerData } = useQuery<{ isOwner: boolean } | null>({
    queryKey: ["/api/auth/is-owner"],
    queryFn: async () => {
      const res = await fetch("/api/auth/is-owner", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const isAdmin = !!adminData || !!isOwnerData?.isOwner;

  const initials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-sidebar-logo">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-bold gradient-text text-lg">ArgiFlow</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/30 text-primary ml-0.5">
            AI
          </Badge>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge className="ml-auto text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>AI Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {automationNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge className="ml-auto text-[10px] py-0 px-1.5 bg-chart-3/10 text-chart-3 border-chart-3/20">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Growth</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {growthNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge className="ml-auto text-[10px] py-0 px-1.5 bg-chart-3/10 text-chart-3 border-chart-3/20">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {isAdmin && (
          <div
            data-testid="link-admin-panel"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-primary hover-elevate mb-2 cursor-pointer"
            onClick={async () => {
              if (!adminData) {
                try {
                  await fetch("/api/admin/owner-login", { method: "POST", credentials: "include" });
                } catch {}
              }
              window.location.href = "/admin/dashboard";
            }}
          >
            <Shield className="w-4 h-4" />
            <span className="font-medium">Platform Admin</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName || "User"} {user?.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email || ""}
            </p>
          </div>
          <button onClick={() => logout()} data-testid="button-logout">
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
