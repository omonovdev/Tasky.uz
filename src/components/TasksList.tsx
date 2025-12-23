import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format, enUS } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { MoreVertical, Edit, Trash2, FileText, CheckCircle2, XCircle, Clock, TrendingUp, Calendar, User, Sparkles, ArrowRight, Flame, Award, Target } from "lucide-react";
import FireProgress from "./FireProgress";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateTaskDialog from "./CreateTaskDialog";
import EditTaskDialog from "./EditTaskDialog";
import TaskReportsDialog from "./TaskReportsDialog";
import TaskDeclineDialog from "./TaskDeclineDialog";
import EstimatedTimeDialog from "./EstimatedTimeDialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  assigned_to: string;
  assigned_by: string;
  assigned_to_name?: string;
  assigned_by_name?: string;
  created_at: string;
  last_edited_by?: string;
  last_edited_at?: string;
  last_edited_by_name?: string;
  decline_reason?: string | null;
  estimated_completion_hours?: number | null;
}

interface GroupedTasks {
  [month: string]: Task[];
}

interface TasksListProps {
  organizationId: string;
  isCreator: boolean;
  showOnlyMyTasks?: boolean;
  filterStatus?: "all" | "pending" | "completed";
  onFilterChange?: (filter: "all" | "pending" | "completed") => void;
}

const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (orgId: string, userId?: string) => [...taskKeys.lists(), { orgId, userId }] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
};

const formatEstimatedTime = (minutes?: number | null) => {
  if (!minutes) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export default function TasksList({ 
  organizationId, 
  isCreator, 
  showOnlyMyTasks = false, 
  filterStatus = "all", 
  onFilterChange 
}: TasksListProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [viewingReports, setViewingReports] = useState<string | null>(null);
  const [decliningTask, setDecliningTask] = useState<string | null>(null);
  const [estimatingTask, setEstimatingTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentUserId(authJwt.getUserId());
  }, []);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
    queryFn: async () => {
      if (!organizationId || organizationId.startsWith("11111111-")) {
        return [];
      }

      const all = !showOnlyMyTasks;
      const data = await api.tasks.list({ organizationId, all });

      return (data || []).map((task: any) => {
        const assigneeUsers = (task.assignments || [])
          .map((a: any) => a.user)
          .filter(Boolean);
        const namesFromAssignments = assigneeUsers
          .map((u: any) => `${u.firstName || ""} ${u.lastName || ""}`.trim())
          .filter(Boolean)
          .join(", ");
        const assignedToName = task.assignedTo
          ? `${task.assignedTo.firstName || ""} ${task.assignedTo.lastName || ""}`.trim()
          : "";
        const assignedToNames = namesFromAssignments || assignedToName || "Unknown";

        const assignedByName = task.assignedBy
          ? `${task.assignedBy.firstName || ""} ${task.assignedBy.lastName || ""}`.trim()
          : "Unknown";

        let editorName: string | undefined = undefined;
        if (task.lastEditedBy) {
          const candidates = [
            task.assignedBy,
            task.assignedTo,
            ...assigneeUsers,
          ].filter(Boolean);
          const found = candidates.find((u: any) => u.id === task.lastEditedBy);
          if (found) {
            editorName = `${found.firstName || ""} ${found.lastName || ""}`.trim() || undefined;
          }
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description || "",
          deadline: task.deadline,
          status: task.status,
          assigned_to: task.assignedToId,
          assigned_by: task.assignedById,
          assigned_to_name: assignedToNames,
          assigned_by_name: assignedByName,
          created_at: task.createdAt,
          last_edited_by: task.lastEditedBy ?? undefined,
          last_edited_at: task.lastEditedAt ?? undefined,
          last_edited_by_name: editorName,
          decline_reason: task.declineReason ?? null,
          estimated_completion_hours: task.estimatedCompletionHours ?? null,
        } satisfies Task;
      });
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled: !!currentUserId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.tasks.delete(taskId);
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
      });

      const previousTasks = queryClient.getQueryData<Task[]>(
        taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
      );

      queryClient.setQueryData<Task[]>(
        taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
        (old = []) => old.filter(task => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
          context.previousTasks
        );
      }
      toast({
        title: t("common.error"),
        description: t("tasksPageSection.deleteError"),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("tasksPageSection.deleteSuccess"),
      });
      setDeletingTask(null);
    },
  });

  const handleDeleteTask = (taskId: string) => {
    deleteMutation.mutate(taskId);
  };

  const getLocale = () => {
    switch(i18n.language) {
      case 'ru': return ru;
      case 'uz': return uz;
      default: return enUS;
    }
  };

  const groupedTasks: GroupedTasks = tasks.reduce((acc, task) => {
    const dateObj = new Date(task.deadline);
    const monthYear = format(dateObj, 'MMMM yyyy', { locale: getLocale() });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(task);
    return acc;
  }, {} as GroupedTasks);

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (totalMinutes < 0) {
      const overdueDays = Math.floor(Math.abs(totalMinutes) / (60 * 24));
      const overdueHours = Math.floor(Math.abs(totalMinutes) / 60);
      if (overdueDays > 0) return t("tasksPageSection.time.overdueDays", { count: overdueDays });
      return t("tasksPageSection.time.overdueHours", { count: overdueHours });
    }
    
    if (totalMinutes < 60) {
      return t("tasksPageSection.time.minutesLeft", { count: totalMinutes });
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
      return t("tasksPageSection.time.hoursLeft", { count: totalHours });
    }
    
    const totalDays = Math.floor(totalHours / 24);
    return t("tasksPageSection.time.daysLeft", { count: totalDays });
  };

  const getCompletionPercentage = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      default:
        return 0;
    }
  };

  const getUrgencyLevel = (deadline: string, status: string) => {
    if (status === 'completed') return 'completed';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'critical';
    if (hoursLeft < 72) return 'urgent';
    return 'normal';
  };

  const effectiveFilter = onFilterChange ? filterStatus : filterMode;
  
  const filteredTasks = effectiveFilter === 'all' 
    ? tasks 
    : effectiveFilter === 'completed' 
      ? tasks.filter(t => t.status === 'completed')
      : tasks.filter(t => t.status === 'in_progress' || t.status === 'pending');

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length;

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-7 w-7 text-primary animate-pulse" />
            {t("tasksPageSection.title")}
          </h2>
          <p className="text-muted-foreground mt-1">{t("tasksPageSection.subtitle")}</p>
        </div>
        {isCreator && (
          <CreateTaskDialog organizationId={organizationId} onTaskCreated={handleTaskUpdated} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-5 duration-500">
        <Card 
          className={cn(
            "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border-2",
            "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
            (onFilterChange ? filterStatus === "pending" : filterMode === 'in_progress') 
              ? 'border-primary/40 shadow-2xl shadow-primary/20 ring-2 ring-primary' 
              : 'border-primary/20 hover:border-primary/30 hover:shadow-xl'
          )}
          onClick={() => {
            if (onFilterChange) {
              onFilterChange(filterStatus === "pending" ? "all" : "pending");
            } else {
              setFilterMode(filterMode === 'in_progress' ? 'all' : 'in_progress');
            }
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-10">
            <Flame className="h-32 w-32 text-primary" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
              {inProgressCount}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{t("tasksPageSection.toBeCompleted")}</p>
            <Progress value={(inProgressCount / (tasks.length || 1)) * 100} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border-2",
            "bg-gradient-to-br from-success/10 via-success/5 to-transparent",
            (onFilterChange ? filterStatus === "completed" : filterMode === 'completed') 
              ? 'border-success/40 shadow-2xl shadow-success/20 ring-2 ring-success' 
              : 'border-success/20 hover:border-success/30 hover:shadow-xl'
          )}
          onClick={() => {
            if (onFilterChange) {
              onFilterChange(filterStatus === "completed" ? "all" : "completed");
            } else {
              setFilterMode(filterMode === 'completed' ? 'all' : 'completed');
            }
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-10">
            <Award className="h-32 w-32 text-success" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/10 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <ArrowRight className="h-5 w-5 text-success opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-4xl font-bold text-success mb-2 group-hover:scale-110 transition-transform">
              {completedCount}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{t("tasksPageSection.completedTasks")}</p>
            <Progress value={(completedCount / (tasks.length || 1)) * 100} className="h-1.5 mt-3 [&>div]:bg-success" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {filteredTasks.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <Target className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t("tasksPageSection.emptyTitle")}</h3>
            <p className="text-muted-foreground">
              {effectiveFilter === 'completed' 
                ? t("tasksPageSection.emptyCompleted") 
                : effectiveFilter === 'in_progress' || effectiveFilter === 'pending'
                ? t("tasksPageSection.emptyInProgress")
                : t("tasksPageSection.emptyDefault")}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-lg py-3 z-20 px-2 sm:px-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent truncate flex-1">
                    {t("tasksPageSection.activeTasks")}
                  </h3>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {t("tasksPageSection.countTasks", { count: filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length })}
                  </Badge>
                </div>

                        {Object.entries(groupedTasks).map(([month, monthTasks]) => {
                  const inProgressTasks = monthTasks.filter(t => 
                    (t.status === 'in_progress' || t.status === 'pending') && filteredTasks.includes(t)
                  );
                  if (inProgressTasks.length === 0) return null;
                  
                  return (
                    <div key={month} className="space-y-3">
                      <div className="flex items-center gap-2 px-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h4 className="text-lg font-semibold text-primary">{month}</h4>
                      </div>

                      <div className="grid gap-3">
                        {inProgressTasks.map((task, index) => {
                          const urgency = getUrgencyLevel(task.deadline, task.status);
                          const completionPercentage = getCompletionPercentage(task.status);
                          
                          return (
                            <Card
                              key={task.id}
                              className={cn(
                                "group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-2 cursor-pointer",
                                "animate-in fade-in slide-in-from-left-4",
                                urgency === 'overdue' && "border-destructive/30 bg-destructive/5",
                                urgency === 'critical' && "border-destructive/20 bg-destructive/3",
                                urgency === 'urgent' && "border-amber-500/20 bg-amber-500/3",
                                urgency === 'normal' && "border-border hover:border-primary/30",
                                hoveredTask === task.id && "scale-[1.02] shadow-xl"
                              )}
                              style={{ animationDelay: `${index * 75}ms` }}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => setHoveredTask(null)}
                              onClick={() => navigate(`/task/${task.id}`)}
                            >
                              <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                urgency === 'overdue' && "bg-gradient-to-br from-destructive/10 to-transparent",
                                urgency === 'critical' && "bg-gradient-to-br from-destructive/5 to-transparent",
                                urgency === 'urgent' && "bg-gradient-to-br from-amber-500/5 to-transparent",
                                urgency === 'normal' && "bg-gradient-to-br from-primary/5 to-transparent"
                              )} />

                              <div className="relative p-6 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start gap-3">
                                      <div className={cn(
                                        "p-2 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform",
                                        urgency === 'overdue' && "bg-destructive/10",
                                        urgency === 'critical' && "bg-destructive/10",
                                        urgency === 'urgent' && "bg-amber-500/10",
                                        urgency === 'normal' && "bg-primary/10"
                                      )}>
                                        {urgency === 'overdue' || urgency === 'critical' ? (
                                          <Flame className={cn("h-5 w-5", urgency === 'overdue' ? "text-destructive animate-pulse" : "text-destructive")} />
                                        ) : urgency === 'urgent' ? (
                                          <Clock className="h-5 w-5 text-amber-500" />
                                        ) : (
                                          <Target className="h-5 w-5 text-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                        <User className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{task.assigned_to_name}</span>
                                      </div>
                                      {task.estimated_completion_hours && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span>{formatEstimatedTime(task.estimated_completion_hours)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* ✨ YANGI: Right Side Info with Deadline Card */}
                                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                    <Badge
                                      variant={task.status === 'pending' ? 'pending' : 'inProgress'}
                                      className="animate-in zoom-in"
                                    >
                                      {task.status === 'pending' ? t("tasks.pending") : t("tasks.inProgress")}
                                    </Badge>

                                    {/* Deadline Card */}
                                    <div className={cn(
                                      "relative group/deadline overflow-hidden rounded-xl p-3 border-2 transition-all duration-300 min-w-[140px]",
                                      "hover:scale-105 hover:shadow-lg backdrop-blur-sm",
                                      urgency === 'overdue' && "bg-gradient-to-br from-destructive/20 to-destructive/10 border-destructive/40 shadow-destructive/20",
                                      urgency === 'critical' && "bg-gradient-to-br from-destructive/15 to-destructive/5 border-destructive/30",
                                      urgency === 'urgent' && "bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/30 shadow-amber-500/10",
                                      urgency === 'normal' && "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 shadow-primary/10"
                                    )}>
                                      <div className="absolute -right-2 -top-2 opacity-10 group-hover/deadline:opacity-20 transition-opacity rotate-12">
                                        <Calendar className="h-16 w-16" />
                                      </div>

                                      <div className="relative space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Clock className={cn(
                                            "h-4 w-4 flex-shrink-0",
                                            urgency === 'overdue' && "text-destructive animate-pulse",
                                            urgency === 'critical' && "text-destructive",
                                            urgency === 'urgent' && "text-amber-600",
                                            urgency === 'normal' && "text-primary"
                                          )} />
                                          <div className={cn(
                                            "font-black text-xl leading-none",
                                            urgency === 'overdue' && "text-destructive animate-pulse",
                                            urgency === 'critical' && "text-destructive",
                                            urgency === 'urgent' && "text-amber-600",
                                            urgency === 'normal' && "text-primary"
                                          )}>
                                            {formatTimeRemaining(task.deadline)}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Calendar className="h-3 w-3" />
                                          <span className="font-medium">
                                            {format(new Date(task.deadline), 'MMM dd, yyyy')}
                                          </span>
                                        </div>

                                        <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                                          <div 
                                            className={cn(
                                              "h-full rounded-full transition-all duration-1000",
                                              urgency === 'overdue' && "w-full bg-destructive animate-pulse",
                                              urgency === 'critical' && "w-3/4 bg-destructive",
                                              urgency === 'urgent' && "w-1/2 bg-amber-500",
                                              urgency === 'normal' && "w-1/4 bg-primary"
                                            )}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {isCreator && (
                                          <>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingReports(task.id); }}>
                                              <FileText className="h-4 w-4 mr-2" />
                                              {t("tasksPageSection.actions.viewReports")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              {t("tasksPageSection.actions.edit")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => { e.stopPropagation(); setDeletingTask(task.id); }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              {t("tasksPageSection.actions.delete")}
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {!isCreator && (
                                          <>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEstimatingTask(task); }}>
                                              <Clock className="h-4 w-4 mr-2" />
                                              {t("tasksPageSection.actions.setEstimate")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => { e.stopPropagation(); setDecliningTask(task.id); }}
                                              className="text-destructive"
                                            >
                                              <XCircle className="h-4 w-4 mr-2" />
                                              {t("tasksPageSection.actions.cannotComplete")}
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                    <div className="space-y-2">
                                      <FireProgress deadline={task.deadline} createdAt={task.created_at} />
                                      
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">{t("tasksPageSection.taskProgress")}</span>
                                      <span className="font-bold">{completionPercentage}%</span>
                                    </div>
                                        <Progress 
                                          value={completionPercentage} 
                                      className="h-2 group-hover:h-2.5 transition-all [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/50" 
                                    />
                                  </div>
                                </div>

                                {task.decline_reason && (
                                  <div className="flex gap-2 p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg animate-in slide-in-from-left-2">
                                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-destructive">{t("tasksPageSection.cannotComplete")}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{task.decline_reason}</p>
                                    </div>
                                  </div>
                                )}

                                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredTasks.filter(t => t.status === "completed").length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-lg py-3 z-20 px-2 sm:px-4">
                  <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-success to-success/50 bg-clip-text text-transparent truncate flex-1">
                    {t("tasksPageSection.completedHeader")}
                  </h3>
                  <Badge variant="secondary" className="flex-shrink-0 bg-success/10 text-success border-success/20">
                    {t("tasksPageSection.completedCount", { count: filteredTasks.filter(t => t.status === "completed").length })}
                  </Badge>
                </div>

                        {Object.entries(groupedTasks).map(([month, monthTasks]) => {
                  const completedTasks = monthTasks.filter(t => t.status === "completed" && filteredTasks.includes(t));
                  if (completedTasks.length === 0) return null;
                  
                  return (
                    <div key={month} className="space-y-3">
                      <div className="flex items-center gap-2 px-2">
                        <Calendar className="h-4 w-4 text-success" />
                        <h4 className="text-lg font-semibold text-success">{month}</h4>
                      </div>

                      <div className="grid gap-3">
                        {completedTasks.map((task, index) => (
                          <Card
                            key={task.id}
                            className={cn(
                              "group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2 border-success/20 cursor-pointer",
                              "bg-gradient-to-br from-success/5 to-transparent",
                              "animate-in fade-in slide-in-from-left-4"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => navigate(`/task/${task.id}`)}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 opacity-5">
                              <CheckCircle2 className="h-24 w-24 text-success" />
                            </div>

                            <div className="relative p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                                      <CheckCircle2 className="h-5 w-5 text-success" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-lg truncate opacity-75 group-hover:opacity-100 transition-opacity">
                                        {task.title}
                                      </h4>
                                      {task.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                      <User className="h-3 w-3 text-success" />
                                      <span className="font-medium">{task.assigned_to_name}</span>
                                    </div>
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span>{new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(task.deadline))}</span>
                                      </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  <Badge variant="completed" className="animate-in zoom-in">
                                    {t("tasks.completed")}
                                  </Badge>
                                  
                                  {isCreator && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingReports(task.id); }}>
                                          <FileText className="h-4 w-4 mr-2" />
                                          {t("tasksPageSection.actions.viewReports")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          {t("tasksPageSection.actions.edit")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={(e) => { e.stopPropagation(); setDeletingTask(task.id); }}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {t("tasksPageSection.actions.delete")}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>

                              <Progress value={100} className="h-1.5 mt-4 [&>div]:bg-success" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editingTask && (
        <EditTaskDialog
          taskId={editingTask}
          organizationId={organizationId}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {viewingReports && (
        <TaskReportsDialog
          taskId={viewingReports}
          open={!!viewingReports}
          onOpenChange={(open) => !open && setViewingReports(null)}
        />
      )}

      {decliningTask && (
        <TaskDeclineDialog
          taskId={decliningTask}
          open={!!decliningTask}
          onOpenChange={(open) => !open && setDecliningTask(null)}
          onDeclineSubmitted={handleTaskUpdated}
        />
      )}

      {estimatingTask && (
        <EstimatedTimeDialog
          taskId={estimatingTask.id}
          currentEstimate={estimatingTask.estimated_completion_hours}
          open={!!estimatingTask}
          onOpenChange={(open) => !open && setEstimatingTask(null)}
          onEstimateUpdated={handleTaskUpdated}
        />
      )}

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTask && handleDeleteTask(deletingTask)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
