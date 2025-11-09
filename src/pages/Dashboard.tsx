import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Bell, CheckCircle2, Clock, AlertCircle, Users, Building2, TrendingUp, Target, Zap, Award, ArrowRight, Plus, Sparkles } from "lucide-react";
import TasksList from "@/components/TasksList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateOrganizationForm } from "@/components/CreateOrganizationForm";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  const queryClient = useQueryClient();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    urgent: 0,
    totalCreated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  // Roles that can see the statistics section
  const ALLOWED_ROLES = ['CEO', 'CMO', 'Founder', 'CTO', 'Manager'];

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

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
  }, []);

  useEffect(() => {
    const initializeDashboard = async () => {
      await fetchOrganization();
      await fetchUserRole();
      await fetchTaskStats();
      await fetchRecentTasks();
      await fetchUserName();
    };
    initializeDashboard();

    // Subscribe to realtime changes for organization members
    const membersChannel = supabase
      .channel('dashboard-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members'
        },
        () => {
          fetchOrganization();
          fetchTaskStats();
        }
      )
      .subscribe();

    // Subscribe to realtime changes for tasks
    const selectedOrgId = localStorage.getItem("selectedOrganizationId");
    const tasksChannel = supabase
      .channel('dashboard-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: selectedOrgId ? `organization_id=eq.${selectedOrgId}` : undefined
        },
        (payload) => {
          console.log('📊 Dashboard: Task changed (realtime):', payload);
          fetchTaskStats();
          fetchRecentTasks();
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    // Subscribe to realtime changes for task assignments
    const assignmentsChannel = supabase
      .channel('dashboard-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments'
        },
        (payload) => {
          console.log('📊 Dashboard: Task assignment changed (realtime):', payload);
          fetchTaskStats();
          fetchRecentTasks();
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [organization?.id]);

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedOrgId = localStorage.getItem("selectedOrganizationId");
      if (!selectedOrgId) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("position")
        .eq("user_id", user.id)
        .eq("organization_id", selectedOrgId)
        .single();

      setUserRole(membership?.position || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedOrgId = localStorage.getItem("selectedOrganizationId");
      if (!selectedOrgId) return;

      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", user.id);

      const assignedTaskIds = assignments?.map(a => a.task_id) || [];
      
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", selectedOrgId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (assignedTaskIds.length > 0) {
        query = query.or(`assigned_by.eq.${user.id},id.in.(${assignedTaskIds.join(',')})`);
      } else {
        query = query.eq("assigned_by", user.id);
      }

      const { data: allTasks } = await query;

      const tasksWithNames = await Promise.all(
        (allTasks || []).map(async (task) => {
          const { data: assignments } = await supabase
            .from('task_assignments')
            .select('user_id')
            .eq('task_id', task.id);
          
          const assigneeIds = assignments?.map(a => a.user_id) || [];
          
          if (assigneeIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .in('id', assigneeIds);
            
            const names = profiles?.map(p => `${p.first_name} ${p.last_name}`).join(', ');
            return { ...task, assignee_names: names };
          }
          
          return task;
        })
      );

      setRecentTasks(tasksWithNames);
    } catch (error) {
      console.error("Error fetching recent tasks:", error);
    }
  };

  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      let selectedOrgId = localStorage.getItem("selectedOrganizationId");
      
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(*)")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setOrganization(null);
        return;
      }

      const isMemberOfSelected = memberships.some(m => m.organization_id === selectedOrgId);
      
      if (!selectedOrgId || !isMemberOfSelected) {
        selectedOrgId = memberships[0].organization_id;
        localStorage.setItem("selectedOrganizationId", selectedOrgId);
      }

      const selectedMembership = memberships.find(m => m.organization_id === selectedOrgId);
      if (selectedMembership && selectedMembership.organizations) {
        setOrganization(selectedMembership.organizations as Organization);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const selectedOrgId = localStorage.getItem("selectedOrganizationId");
      if (!selectedOrgId) return;

      const { data: createdTasks, error: createdErr } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_by", user.id)
        .eq("organization_id", selectedOrgId);

      if (createdErr) throw createdErr;

      const allCreatedTasks = createdTasks || [];

      const now = new Date();
      const completed = allCreatedTasks.filter(t => t.status === "completed").length;
      const inProgress = allCreatedTasks.filter(t => t.status === "in_progress" || t.status === "pending").length;
      const urgent = allCreatedTasks.filter(t => {
        if (!t.deadline) return false;
        const deadline = new Date(t.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft < 72 && hoursLeft > 0 && t.status !== "completed";
      }).length;

      setStats({
        total: allCreatedTasks.length,
        completed,
        inProgress,
        urgent,
        totalCreated: allCreatedTasks.length,
      });
    } catch (error) {
      console.error("Error fetching created task stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationCreated = () => {
    setShowCreateDialog(false);
    fetchOrganization();
    fetchTaskStats();
  };

  const handleStatCardClick = (status: string) => {
    if (!organization) return;
    navigate(`/task-status/${organization.id}/${status}`);
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="container mx-auto p-6 pb-24 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md shadow-2xl border-2 animate-in zoom-in duration-500">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center animate-pulse shadow-lg">
                <Building2 className="h-10 w-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                Welcome to Deadliner
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Get started by creating or joining an organization
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                size="lg"
                className="w-full group shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Building2 className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Create Organization
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
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

  const canViewStatistics = userRole && ALLOWED_ROLES.includes(userRole);

  return (
    <div className="container mx-auto p-6 pb-24 space-y-6 max-h-screen overflow-y-auto bg-gradient-to-br from-background via-primary/[0.02] to-accent/[0.03]">
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
              Let's make today productive
            </p>
          </div>
        </div>
      )}

      {/* Hero Section with Organization Info */}
      {organization && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/10 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative p-8">
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {organization.name}
                  </h1>
                  {organization.subheadline && (
                    <p className="text-xl text-muted-foreground mt-1">{organization.subheadline}</p>
                  )}
                </div>
                
                {organization.motto && (
                  <div className="flex items-center gap-2 p-3 bg-background/50 backdrop-blur rounded-lg border border-primary/10">
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
                  View Full Organization
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Greeting and Quick Stats Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-5 duration-700 delay-100">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            {greeting}, {userName}! 
            <span className="inline-block animate-bounce">👋</span>
          </h2>
          <p className="text-muted-foreground text-lg mt-1">Here's what's happening with your tasks today</p>
        </div>
        
        {canViewStatistics && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 shadow-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{completionRate}%</div>
              <div className="text-xs text-muted-foreground">Completion</div>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <Award className="h-8 w-8 text-primary animate-pulse" />
          </div>
        )}
      </div>

      {/* Task Statistics - Enhanced Visual Cards */}
      {canViewStatistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Total Tasks",
              value: stats.total,
              subtitle: "All tasks created",
              icon: CheckCircle2,
              color: "text-blue-500",
              bgColor: "from-blue-500/10 to-blue-500/5",
              borderColor: "border-blue-500/20",
              hoverColor: "hover:border-blue-500/40",
              status: 'all',
              delay: 0
            },
            {
              title: "Completed",
              value: stats.completed,
              subtitle: `${completionRate}% success rate`,
              icon: CheckCircle2,
              color: "text-success",
              bgColor: "from-success/10 to-success/5",
              borderColor: "border-success/20",
              hoverColor: "hover:border-success/40",
              status: 'completed',
              delay: 100
            },
            {
              title: "In Progress",
              value: stats.inProgress,
              subtitle: "Active tasks",
              icon: Clock,
              color: "text-primary",
              bgColor: "from-primary/10 to-primary/5",
              borderColor: "border-primary/20",
              hoverColor: "hover:border-primary/40",
              status: 'in_progress',
              delay: 200
            },
            {
              title: "Urgent",
              value: stats.urgent,
              subtitle: "Due within 72h",
              icon: AlertCircle,
              color: "text-destructive",
              bgColor: "from-destructive/10 to-destructive/5",
              borderColor: "border-destructive/20",
              hoverColor: "hover:border-destructive/40",
              status: 'urgent',
              delay: 300
            }
          ].map((stat, index) => (
            <Card
              key={stat.title}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 animate-in fade-in slide-in-from-top-6",
                `bg-gradient-to-br ${stat.bgColor}`,
                stat.borderColor,
                stat.hoverColor
              )}
              style={{ animationDelay: `${stat.delay}ms` }}
              onClick={() => handleStatCardClick(stat.status)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-20">
                <stat.icon className={cn("h-32 w-32", stat.color)} />
              </div>
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur shadow-lg group-hover:scale-110 transition-transform")}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <div className={cn("text-4xl font-bold mb-1 group-hover:scale-110 transition-transform", stat.color)}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                
                {stat.title === "Completed" && stats.total > 0 && (
                  <Progress value={completionRate} className="h-2 mt-3" />
                )}
              </CardContent>
              
              <div className="absolute bottom-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions and Recent Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { icon: Plus, label: "Create New Task", onClick: () => {}, color: "text-primary" },
              { icon: Calendar, label: "View Calendar", onClick: () => navigate("/calendar"), color: "text-blue-500" },
              { icon: Bell, label: "Check Notifications", onClick: () => navigate("/notifications"), color: "text-amber-500" },
              { icon: TrendingUp, label: "View Analytics", onClick: () => {}, color: "text-success" }
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
        <Card className="md:col-span-2 group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-accent/30 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl"></div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Recent Activity
              </span>
              <Badge variant="secondary" className="animate-pulse">
                {recentTasks.length} tasks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first task to get started!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {recentTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "group/task relative flex items-start justify-between p-4 border-2 rounded-xl cursor-pointer",
                      "hover:bg-accent/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300",
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
                          {task.status === 'pending' ? 'Pending' :
                           task.status === 'in_progress' ? 'In Progress' :
                           'Completed'}
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

      {/* Tasks List Section */}
      {organization && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <TasksList
            organizationId={organization.id}
            isCreator={true}
            showOnlyMyTasks={true}
            filterStatus={taskFilter}
            onFilterChange={setTaskFilter}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;