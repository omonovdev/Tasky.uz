import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Bell, Users, Building2, TrendingUp, Target, Zap, ArrowRight, Sparkles, Plus, CheckCircle2 } from "lucide-react";
import TasksList from "@/components/TasksList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateOrganizationForm } from "@/components/CreateOrganizationForm";
import { cn } from "@/lib/utils";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import WinterBackground from "@/components/WinterBackground";

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  description: string;
  motto: string;
  photo_url: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t("dashboardExtended.greetings.morning"));
    else if (hour < 18) setGreeting(t("dashboardExtended.greetings.afternoon"));
    else setGreeting(t("dashboardExtended.greetings.evening"));

    // Check if this is the first visit (check localStorage)
    const hasSeenWelcome = localStorage.getItem("hasSeenDashboardWelcome");
    
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      // Mark as seen after showing
      localStorage.setItem("hasSeenDashboardWelcome", "true");
      
      // Hide welcome animation after 3 seconds
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [t]);

  useEffect(() => {
    const initializeDashboard = async () => {
      await fetchOrganization();
      await fetchRecentTasks();
      await fetchUserName();
      setLoading(false);
    };
    initializeDashboard();

    const handleOrgSwitch = (event: any) => {
      const orgId = event?.detail?.organizationId;
      if (orgId) {
        setLoading(true);
        fetchOrganization().then(fetchRecentTasks).finally(() => setLoading(false));
      }
    };
    window.addEventListener("organization-switched", handleOrgSwitch as EventListener);

    return () => {
      window.removeEventListener("organization-switched", handleOrgSwitch as EventListener);
    };
  }, []);

  const fetchUserName = async () => {
    try {
      const me = await api.users.me();
      const name = `${me.firstName || ""} ${me.lastName || ""}`.trim();
      setUserName(name || me.email || "");
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const selectedOrgId = localStorage.getItem("selectedOrganizationId");
      if (!selectedOrgId || selectedOrgId.startsWith("11111111-")) {
        setRecentTasks([]);
        return;
      }

      const allTasks = await api.tasks.list({ organizationId: selectedOrgId, all: true });
      const recent = (allTasks || [])
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((task: any) => {
          const assigneeUsers = (task.assignments || []).map((a: any) => a.user).filter(Boolean);
          const names = assigneeUsers
            .map((u: any) => `${u.firstName || ""} ${u.lastName || ""}`.trim())
            .filter(Boolean)
            .join(", ");
          return { ...task, assignee_names: names || undefined };
        });
      setRecentTasks(recent);
    } catch (error) {
      console.error("Error fetching recent tasks:", error);
    }
  };

  const fetchOrganization = async () => {
    try {
      let selectedOrgId = localStorage.getItem("selectedOrganizationId");
      
      const memberships = await api.organizations.myMemberships();

      if (!memberships || memberships.length === 0) {
        setOrganization(null);
        return;
      }

      const isMemberOfSelected = memberships.some((m: any) => m.organizationId === selectedOrgId);
      
      if (!selectedOrgId || !isMemberOfSelected) {
        selectedOrgId = memberships[0].organizationId;
        localStorage.setItem("selectedOrganizationId", selectedOrgId);
      }

      const selectedMembership = memberships.find((m: any) => m.organizationId === selectedOrgId) || memberships[0];
      const org = selectedMembership.organization;
      if (org) {
        setOrganization({
          id: org.id || selectedOrgId || "",
          name: org.name,
          subheadline: org.subheadline || "",
          description: org.description || "",
          motto: org.motto || "",
          photo_url: org.photoUrl || "",
        });
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      navigate("/auth");
    }
  };

  const handleOrganizationCreated = () => {
    setShowCreateDialog(false);
    fetchOrganization();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <WinterBackground />
        <div className="text-center space-y-4 relative z-10">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">{t("dashboardExtended.loadingWorkspace")}</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto p-6 pb-24 max-h-screen overflow-y-auto relative">
        <WinterBackground />
        <div className="flex items-center justify-center min-h-[60vh] relative z-10">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 animate-in zoom-in duration-500">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center animate-pulse shadow-lg">
                <Building2 className="h-10 w-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                {t("dashboardExtended.noOrgTitle")}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t("dashboardExtended.noOrgSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                size="lg"
                className="w-full group shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Building2 className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                {t("dashboard.createOrganization")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("dashboard.createOrganization")}</DialogTitle>
            </DialogHeader>
            <CreateOrganizationForm 
              onSuccess={handleOrganizationCreated}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6 relative z-10">
      {/* Welcome Animation Overlay - Only shown on first visit */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-out fade-out duration-1000 delay-2000">
          <div className="text-center space-y-4 animate-in zoom-in duration-700">
            <div className="relative">
              <Sparkles className="h-20 w-20 text-primary mx-auto animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-20 w-20 text-primary/30 mx-auto" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              {greeting}, {userName}!
            </h1>
            <p className="text-lg text-muted-foreground animate-pulse">
              {t("dashboardExtended.welcomeSubtitle")}
            </p>
          </div>
        </div>
      )}

      {/* Hero Section with Organization Info */}
      {organization && (
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-0 ring-1 ring-white/30 dark:ring-primary/20 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative p-4 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative group">
                {organization.photo_url ? (
                  <Avatar className="h-28 w-28 border-4 border-background shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
                    <AvatarImage src={organization.photo_url} />
                    <AvatarFallback className="text-3xl">{organization.name[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-28 w-28 bg-gradient-to-br from-primary to-primary/50 rounded-full flex items-center justify-center shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                    <span className="text-4xl font-bold text-primary-foreground">
                      {organization.name[0]}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-bounce">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent break-words">
                    {organization.name}
                  </h1>
                  {organization.subheadline && (
                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground mt-1">{organization.subheadline}</p>
                  )}
                </div>
                
                {organization.motto && (
                  <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg ring-1 ring-white/30 dark:ring-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                    <p className="text-muted-foreground italic">"{organization.motto}"</p>
                  </div>
                )}
                
                {organization.description && (
                  <p className="text-muted-foreground max-w-2xl">{organization.description}</p>
                )}
                
                <Button
                  variant="outline"
                  className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 shadow-lg"
                  onClick={() => navigate(`/organization/${organization.id}`)}
                >
                  <Users className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                  {t("dashboard.viewFullOrganization")}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Greeting and Quick Note */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-5 duration-700 delay-100">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            {greeting}, {userName}!
            <span className="inline-block animate-bounce">👋</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-1">{t("dashboardExtended.heroSubtitle")}</p>
        </div>
        
        {organization && (
          <Button
            onClick={() => navigate(`/organization/${organization.id}/stats`)}
            className="group bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <TrendingUp className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            {t("dashboardExtended.viewOrgStats")}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>

      {/* {t("dashboard.quickActions")} and Recent Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* {t("dashboard.quickActions")} */}
        <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 hover:ring-primary/30 animate-in fade-in slide-in-from-left-4 duration-700 rounded-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { icon: Plus, label: t("dashboardExtended.quickActions.createTask"), onClick: () => setShowCreateTaskDialog(true), color: "text-primary" },
              { icon: CheckCircle2, label: t("dashboardExtended.quickActions.myTasks"), onClick: () => navigate("/tasks"), color: "text-emerald-500" },
              { icon: Calendar, label: t("dashboardExtended.quickActions.viewCalendar"), onClick: () => navigate("/calendar"), color: "text-blue-500" },
              { icon: Bell, label: t("dashboardExtended.quickActions.checkNotifications"), onClick: () => navigate("/notifications"), color: "text-amber-500" },
              { icon: TrendingUp, label: t("dashboardExtended.quickActions.viewAnalytics"), onClick: () => organization && navigate(`/organization/${organization.id}/stats`), color: "text-success" }
            ].map((action, index) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                variant="outline"
                className={cn(
                  "w-full justify-start group/btn hover:bg-accent hover:scale-105 transition-all duration-300 shadow-sm animate-in fade-in slide-in-from-left-2"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <action.icon className={cn("mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform", action.color)} />
                {action.label}
                <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="md:col-span-2 group relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 hover:ring-accent/30 animate-in fade-in slide-in-from-right-4 duration-700 rounded-3xl">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl"></div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                {t("dashboard.recentActivity")}
              </span>
              <Badge variant="secondary" className="animate">
                {t("dashboardExtended.tasksCount", { count: recentTasks.length })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">{t("dashboardExtended.noActivityTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("dashboardExtended.noActivityCta")}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {recentTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group/task relative flex items-start justify-between p-4 border-0 rounded-xl cursor-pointer",
                      "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ring-1 ring-white/30",
                      "hover:bg-white/80 dark:hover:bg-slate-800/80 hover:scale-[1.02] hover:shadow-lg hover:ring-primary/30 transition-all duration-300",
                      "animate-in fade-in slide-in-from-right-2"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => navigate(`/task/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold truncate group-hover/task:text-primary transition-colors">
                          {task.title}
                        </h4>
                        <Badge
                          variant={
                            task.status === 'completed' ? 'completed' :
                            task.status === 'in_progress' ? 'inProgress' :
                            'pending'
                          }
                          className="flex-shrink-0 animate-in zoom-in"
                        >
                          {task.status === 'pending' ? t("tasks.pending") :
                           task.status === 'in_progress' ? t("tasks.inProgress") :
                           t("tasks.completed")}
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.assignee_names && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {task.assignee_names}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover/task:opacity-100 group-hover/task:translate-x-1 transition-all flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Organization Tasks List Section - Shows ALL organization tasks */}
      {organization && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <TasksList
            organizationId={organization.id}
            isCreator={true /* Dashboard faqat tashkilot rahbarlari uchun, shu yerda barcha tasklar ustidan nazorat */}
            showOnlyMyTasks={false}
            filterStatus={taskFilter}
            onFilterChange={setTaskFilter}
          />
        </div>
      )}

      {/* CreateTaskDialog - tashqaridan boshqariladigan */}
      {organization && (
        <CreateTaskDialog
          organizationId={organization.id}
          onTaskCreated={fetchRecentTasks}
          open={showCreateTaskDialog}
          onOpenChange={setShowCreateTaskDialog}
        />
      )}
      </div>
    </div>
  );
};

export default Dashboard;
