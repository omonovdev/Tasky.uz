import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Bell,
  Calendar,
  Trophy,
  User,
  HelpCircle,
  ChevronDown,
  Target,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { useNotificationContext } from "@/components/NotificationContext";

interface ProfileData {
  first_name: string;
  last_name: string;
  position: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
}

interface Organization {
  id: string;
  name: string;
  photo_url: string | null;
}

interface Membership {
  organization_id: string;
  position: string | null;
  organizations: Organization;
}

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    position: null,
    avatar_url: null,
    date_of_birth: null,
  });
  const [organizations, setOrganizations] = useState<Membership[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Membership | null>(null);
  const { unreadCount, refreshUnread } = useNotificationContext();
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    fetchProfile();
    fetchOrganizations();
    refreshUnread();
  }, []);

  const fetchProfile = async () => {
    try {
      const me = await api.users.me();

      const hasRequiredProfile =
        me &&
        me.firstName &&
        me.lastName &&
        me.dateOfBirth;

      if (!hasRequiredProfile) {
        setProfileIncomplete(true);
        setProfile({
          first_name: me?.firstName || me?.email?.split("@")[0] || "User",
          last_name: me?.lastName || "",
          position: me?.position || null,
          avatar_url: me?.avatarUrl || null,
          date_of_birth: me?.dateOfBirth || null,
        });
        return;
      }

      setProfileIncomplete(false);
      setProfile({
        first_name: me.firstName,
        last_name: me.lastName,
        position: me.position,
        avatar_url: me.avatarUrl,
        date_of_birth: me.dateOfBirth,
      });
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    }
  };

  useEffect(() => {
    if (profileIncomplete && location.pathname !== "/profile") {
      if (!notifiedRef.current) {
        toast({
          title: t("auth.profileRequiredTitle") || "Profilni to'ldiring",
          description: t("auth.profileRequiredDesc") || "Profil ma'lumotlari to'ldirilmaguncha asosiy sahifalarga kirish mumkin emas.",
          variant: "destructive",
        });
        notifiedRef.current = true;
      }
      navigate("/profile");
    }

    if (!profileIncomplete) {
      notifiedRef.current = false;
    }
  }, [profileIncomplete, location.pathname, navigate, toast, t]);

  const fetchOrganizations = async () => {
    try {
      const memberships = await api.organizations.myMemberships();

      const data = (memberships || []).map((m: any) => ({
        organization_id: m.organizationId,
        position: m.position ?? null,
        organizations: {
          id: m.organization?.id || m.organizationId,
          name: m.organization?.name || "",
          photo_url: m.organization?.photoUrl || null,
        },
      }));

      if (data.length > 0) {
        setOrganizations(data as any);

        const currentOrgId = localStorage.getItem("selectedOrganizationId");
        if (currentOrgId) {
          const selected = data.find((org: any) => org.organization_id === currentOrgId);
          if (selected) {
            setSelectedOrganization(selected as any);
          } else {
            localStorage.setItem("selectedOrganizationId", data[0].organization_id);
            setSelectedOrganization(data[0] as any);
          }
        } else {
          localStorage.setItem("selectedOrganizationId", data[0].organization_id);
          setSelectedOrganization(data[0] as any);
        }
      } else {
        setOrganizations([]);
        setSelectedOrganization(null);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setOrganizations([]);
      setSelectedOrganization(null);
    }
  };

  const handleOrganizationSwitch = (organizationId: string) => {
    localStorage.setItem("selectedOrganizationId", organizationId);
    const selected = organizations.find(org => org.organization_id === organizationId);
    if (selected) {
      setSelectedOrganization(selected);
    }
    window.dispatchEvent(new CustomEvent("organization-switched", { detail: { organizationId } }));
    navigate("/dashboard");
    // window.location.reload();
  };

  const getInitials = () => {
    const firstInitial = profile.first_name?.[0] || "";
    const lastInitial = profile.last_name?.[0] || "";
    return `${firstInitial}${lastInitial}`.toUpperCase() || "U";
  };

  const menuItems = [
    { title: t("nav.dashboard"), icon: LayoutDashboard, path: "/dashboard" },
    { title: t("nav.notifications"), icon: Bell, path: "/notifications" },
    { title: t("nav.calendar"), icon: Calendar, path: "/calendar" },
    { title: t("nav.team"), icon: Trophy, path: "/team" },
    { title: t("nav.goals"), icon: Target, path: "/goals" },
    { title: t("nav.account"), icon: User, path: "/profile" },
    { title: t("nav.help"), icon: HelpCircle, path: "/help" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full flex-col">
        {/* Top Bar with Organization Switcher */}
        <div className="h-16 border-b bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <h2 className="hidden sm:block text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
              {t("app.name")}
            </h2>
          </div>
          
          {selectedOrganization?.organizations && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-all duration-200 shadow-sm flex-shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20 flex-shrink-0">
                  <AvatarImage src={selectedOrganization.organizations.photo_url || ""} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-secondary text-white">
                    {selectedOrganization.organizations.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start min-w-0 max-w-xs">
                  <span className="text-sm font-medium truncate w-full">{selectedOrganization.organizations.name}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{selectedOrganization.position || "Member"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-popover rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                {organizations.map((membership) => (
                  membership.organizations && (
                    <DropdownMenuItem
                      key={membership.organization_id}
                      className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-muted transition-all duration-200"
                      onClick={() => handleOrganizationSwitch(membership.organization_id)}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20 flex-shrink-0">
                        <AvatarImage src={membership.organizations.photo_url || ""} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-secondary text-white">
                          {membership.organizations.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{membership.organizations.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{membership.position || "Member"}</span>
                      </div>
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-1">
          <Sidebar collapsible="icon" className="border-r-2 hidden md:flex">
            <SidebarHeader className="p-4 border-b mt-4">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-xl p-2 transition-all duration-200" 
                onClick={() => navigate("/profile")}
              >
                <Avatar className="h-10 w-10 ring-2 ring-primary/30 shadow-lg">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate">
                    {profile.first_name || "User"} {profile.last_name || ""}
                  </span>
                  {profile.position && (
                    <span className="text-xs text-muted-foreground truncate">
                      {profile.position}
                    </span>
                  )}
                  {!profile.position && selectedOrganization?.position && (
                    <span className="text-xs truncate" style={{fontWeight: "Bold"}}>
                      {selectedOrganization.position}
                    </span>
                  )}
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="pt-4">
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/70 font-semibold">
                  {t("nav.dashboard")}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.slice(0, -1).map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const showBadge = item.path === "/notifications" && unreadCount > 0;
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            className={isActive ? "bg-sidebar-accent border-l-4 border-primary shadow-md" : "hover:bg-sidebar-accent/50 transition-all duration-200"}
                          >
                            <NavLink to={item.path} className="flex items-center gap-3">
                              <div className="relative">
                                <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                {showBadge && (
                                  <Badge 
                                    variant="destructive" 
                                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse-glow"
                                  >
                                    {unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <span className={isActive ? "font-semibold text-primary" : ""}>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              {/* Help at bottom */}
              <SidebarGroup className="mt-auto">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.slice(-1).map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive}
                            className={isActive ? "bg-sidebar-accent border-l-4 border-primary shadow-md" : "hover:bg-sidebar-accent/50 transition-all duration-200"}
                          >
                            <NavLink to={item.path} className="flex items-center gap-3">
                              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                              <span className={isActive ? "font-semibold text-primary" : ""}>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 overflow-auto bg-background pb-20 md:pb-0">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;
