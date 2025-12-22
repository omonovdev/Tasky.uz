import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  FileText, 
  XCircle, 
  Clock, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Sparkles,
  Target,
  TrendingUp,
  Flame,
  Award
} from "lucide-react";
import FireProgress from "@/components/FireProgress";
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
import EditTaskDialog from "@/components/EditTaskDialog";
import TaskReportsDialog from "@/components/TaskReportsDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  assigned_to: string;
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

const TaskStatusDetails = () => {
  const { organizationId, status } = useParams<{ organizationId: string; status: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<GroupedTasks>({});
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [viewingReports, setViewingReports] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const formatEstimatedTime = (minutes?: number | null) => {
    if (!minutes) return null;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  useEffect(() => {
    fetchTasks();
  }, [organizationId, status]);

  const fetchTasks = async () => {
    try {
      const userId = authJwt.getUserId();
      if (!userId) return;
      if (!organizationId || organizationId.startsWith("11111111-")) {
        setTasks([]);
        setGroupedTasks({});
        setLoading(false);
        return;
      }

      const rawTasks = await api.tasks.list({
        organizationId,
        all: true,
        assignedById: userId,
      });

      let filteredData = rawTasks || [];

      if (status === 'urgent') {
        const now = new Date();
        filteredData = filteredData.filter(task => {
          if (!task.deadline) return false;
          const deadline = new Date(task.deadline);
          const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          return task.status !== "completed" && hoursLeft < 72 && hoursLeft > 0;
        });
      } else if (status === "completed") {
        filteredData = filteredData.filter((t: any) => t.status === "completed");
      } else if (status === "in_progress") {
        filteredData = filteredData.filter((t: any) => t.status === "pending" || t.status === "in_progress");
      }

      const tasksWithNames: Task[] = filteredData
        .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .map((task: any) => {
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
            assigned_to_name: assignedToNames,
            assigned_by_name: assignedByName,
            created_at: task.createdAt,
            last_edited_by: task.lastEditedBy ?? undefined,
            last_edited_at: task.lastEditedAt ?? undefined,
            last_edited_by_name: editorName,
            decline_reason: task.declineReason ?? null,
            estimated_completion_hours: task.estimatedCompletionHours ?? null,
          };
        });

      setTasks(tasksWithNames);
      groupTasksByMonth(tasksWithNames);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupTasksByMonth = (tasks: Task[]) => {
    const grouped: GroupedTasks = {};
    
    tasks.forEach(task => {
      const monthYear = format(new Date(task.deadline), 'MMMM yyyy');
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(task);
    });
    
    setGroupedTasks(grouped);
  };

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (totalMinutes < 0) {
      const overdueDays = Math.floor(Math.abs(totalMinutes) / (60 * 24));
      const overdueHours = Math.floor(Math.abs(totalMinutes) / 60);
      if (overdueDays > 0) return t("taskStatusDetails.time.overdueDays", { count: overdueDays });
      return t("taskStatusDetails.time.overdueHours", { count: overdueHours });
    }
    
    if (totalMinutes < 60) {
      return t("taskStatusDetails.time.minutesLeft", { count: totalMinutes });
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
      return t("taskStatusDetails.time.hoursLeft", { count: totalHours });
    }
    
    const totalDays = Math.floor(totalHours / 24);
    return t("taskStatusDetails.time.daysLeft", { count: totalDays });
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

  const getUrgencyLevel = (deadline: string, taskStatus: string) => {
    if (taskStatus === 'completed') return 'completed';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'critical';
    if (hoursLeft < 72) return 'urgent';
    return 'normal';
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.tasks.delete(taskId);
    } catch {
      toast({
        title: t("common.error"),
        description: t("taskStatusDetails.deleteError"),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("common.success"),
      description: t("taskStatusDetails.deleteSuccess"),
    });

    setDeletingTask(null);
    fetchTasks();
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          label: t("taskStatusDetails.headers.completed"),
          icon: CheckCircle2,
          color: 'text-success',
          bgGradient: 'from-success/10 via-success/5 to-transparent',
          borderColor: 'border-success/20',
          badge: 'bg-success/10 text-success border-success/20'
        };
      case 'in_progress':
        return {
          label: t("taskStatusDetails.headers.inProgress"),
          icon: Clock,
          color: 'text-primary',
          bgGradient: 'from-primary/10 via-primary/5 to-transparent',
          borderColor: 'border-primary/20',
          badge: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'urgent':
        return {
          label: t("taskStatusDetails.headers.urgent"),
          icon: Flame,
          color: 'text-destructive',
          bgGradient: 'from-destructive/10 via-destructive/5 to-transparent',
          borderColor: 'border-destructive/20',
          badge: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      default:
        return {
          label: t("taskStatusDetails.headers.all"),
          icon: Target,
          color: 'text-muted-foreground',
          bgGradient: 'from-muted/10 to-transparent',
          borderColor: 'border-border',
          badge: 'bg-muted text-muted-foreground'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-accent/[0.03]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">{t("taskStatusDetails.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-accent/[0.03]">
      <div className="container mx-auto p-6 pb-24 space-y-6 max-h-screen overflow-y-auto">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br border-2 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700"
          style={{ 
            backgroundImage: `linear-gradient(to bottom right, ${statusConfig.bgGradient})`,
            borderColor: statusConfig.borderColor.replace('border-', '')
          }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10 -translate-y-1/2 translate-x-1/2">
            <StatusIcon className={cn("h-64 w-64", statusConfig.color)} />
          </div>
          
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-background/50 backdrop-blur transition-all hover:scale-110"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className={cn("p-3 rounded-xl bg-background/50 backdrop-blur shadow-lg", statusConfig.color)}>
                <StatusIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {statusConfig.label}
                </h1>
                <p className="text-muted-foreground text-lg mt-1">
                  {t("taskStatusDetails.viewingCount", { count: tasks.length })}
                </p>
              </div>
              <Badge className={cn("px-4 py-2 text-base font-semibold animate-pulse", statusConfig.badge)}>
                {t("taskStatusDetails.total", { count: tasks.length })}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tasks Display */}
        {tasks.length === 0 ? (
          <Card className="relative overflow-hidden border-2 border-dashed animate-in zoom-in duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/5 to-transparent"></div>
            <CardContent className="p-16 text-center relative z-10">
              <div className="inline-block p-6 bg-muted/10 rounded-2xl mb-6 animate-pulse">
                <StatusIcon className={cn("h-20 w-20", statusConfig.color)} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t("taskStatusDetails.emptyTitle")}</h3>
              <p className="text-muted-foreground text-lg">
                {t("taskStatusDetails.emptySubtitle", { status: status === 'all' ? t("taskStatusDetails.statusGeneric") : status.replace('_', ' ') })}
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="mt-6"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("taskStatusDetails.backToDashboard")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTasks).map(([month, monthTasks], monthIndex) => (
              <div 
                key={month} 
                className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500"
                style={{ animationDelay: `${monthIndex * 100}ms` }}
              >
                {/* Month Header */}
                <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-lg py-3 z-20 border-b-2 rounded-lg px-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                    {month}
                  </h3>
                  <Badge variant="secondary" className="ml-auto">
                    {t("taskStatusDetails.monthCount", { count: monthTasks.length })}
                  </Badge>
                </div>

                {/* Tasks Grid */}
                <div className="space-y-3">
                  {monthTasks.map((task, index) => {
                    const day = format(new Date(task.deadline), 'dd.MM.yyyy');
                    const completionPercentage = getCompletionPercentage(task.status);
                    const urgency = getUrgencyLevel(task.deadline, task.status);
                    
                    return (
                      <Card
                        key={task.id}
                        className={cn(
                          "group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-2 cursor-pointer",
                          "animate-in fade-in slide-in-from-left-4",
                          urgency === 'overdue' && "border-destructive/30 bg-destructive/5",
                          urgency === 'critical' && "border-destructive/20 bg-destructive/3",
                          urgency === 'urgent' && "border-amber-500/20 bg-amber-500/3",
                          urgency === 'completed' && "border-success/20 bg-success/3",
                          urgency === 'normal' && "border-border hover:border-primary/30",
                          hoveredTask === task.id && "scale-[1.02] shadow-xl"
                        )}
                        style={{ animationDelay: `${index * 75}ms` }}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        onClick={() => navigate(`/task/${task.id}`)}
                      >
                        {/* Animated Background */}
                        <div className={cn(
                          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                          urgency === 'overdue' && "bg-gradient-to-br from-destructive/10 to-transparent",
                          urgency === 'critical' && "bg-gradient-to-br from-destructive/5 to-transparent",
                          urgency === 'urgent' && "bg-gradient-to-br from-amber-500/5 to-transparent",
                          urgency === 'completed' && "bg-gradient-to-br from-success/5 to-transparent",
                          urgency === 'normal' && "bg-gradient-to-br from-primary/5 to-transparent"
                        )} />

                        <div className="relative p-6 space-y-4">
                          {/* Task Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform",
                                  urgency === 'overdue' && "bg-destructive/10",
                                  urgency === 'critical' && "bg-destructive/10",
                                  urgency === 'urgent' && "bg-amber-500/10",
                                  urgency === 'completed' && "bg-success/10",
                                  urgency === 'normal' && "bg-primary/10"
                                )}>
                                  {urgency === 'overdue' || urgency === 'critical' ? (
                                    <Flame className={cn("h-5 w-5", urgency === 'overdue' ? "text-destructive animate-pulse" : "text-destructive")} />
                                  ) : urgency === 'urgent' ? (
                                    <Clock className="h-5 w-5 text-amber-500" />
                                  ) : urgency === 'completed' ? (
                                    <Award className="h-5 w-5 text-success" />
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

                              {/* Metadata Pills */}
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md border">
                                  <User className="h-3 w-3 text-primary" />
                                  <span className="font-medium">{task.assigned_to_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md border">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span>{t("taskStatusDetails.byLabel", { name: task.assigned_by_name })}</span>
                                </div>
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md border">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{format(new Date(task.created_at), 'MMM dd HH:mm')}</span>
                              </div>
                                {task.estimated_completion_hours && (
                                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md border border-primary/20">
                                    <Clock className="h-3 w-3 text-primary" />
                                    <span className="font-semibold text-primary">{formatEstimatedTime(task.estimated_completion_hours)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Last Edited Info (hide for completed tasks) */}
                              {task.status !== 'completed' && task.last_edited_by_name && task.last_edited_at && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/20 w-fit">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{t("taskStatusDetails.editedByOn", { name: task.last_edited_by_name, date: format(new Date(task.last_edited_at), 'MMM dd HH:mm') })}</span>
                                </div>
                              )}
                            </div>

                            {/* Right Side Actions */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "text-xl font-bold px-3 py-1 rounded-lg",
                                  urgency === 'overdue' && "text-destructive bg-destructive/10",
                                  urgency === 'critical' && "text-destructive bg-destructive/10",
                                  urgency === 'urgent' && "text-amber-500 bg-amber-500/10",
                                  urgency === 'completed' && "text-success bg-success/10",
                                  urgency === 'normal' && "text-primary bg-primary/10"
                                )}>
                                  {day}
                                </div>
                                {task.status === 'pending' && (
                                  <Badge variant="pending" className="animate-in zoom-in">
                                    {t("taskStatusDetails.statusBadge.pending")}
                                  </Badge>
                                )}
                                {task.status === 'in_progress' && (
                                  <Badge variant="inProgress" className="animate-in zoom-in">
                                    {t("taskStatusDetails.statusBadge.inProgress")}
                                  </Badge>
                                )}
                                {task.status === 'completed' && (
                                  <Badge variant="completed" className="animate-in zoom-in">
                                    {t("taskStatusDetails.statusBadge.completed")}
                                  </Badge>
                                )}
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
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingReports(task.id); }}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t("taskStatusDetails.actions.viewReports")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t("taskStatusDetails.actions.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); setDeletingTask(task.id); }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("taskStatusDetails.actions.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Time Progress (only for non-completed) */}
                          {task.status !== 'completed' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">{t("taskStatusDetails.timeRemainingLabel")}</span>
                                <span className={cn(
                                  "font-bold text-base px-2 py-0.5 rounded-md",
                                  urgency === 'overdue' && "text-destructive bg-destructive/10",
                                  urgency === 'critical' && "text-destructive",
                                  urgency === 'urgent' && "text-amber-500",
                                  urgency === 'normal' && "text-primary"
                                )}>
                                  {formatTimeRemaining(task.deadline)}
                                </span>
                              </div>
                              <FireProgress deadline={task.deadline} createdAt={task.created_at} />
                            </div>
                          )}

                          {/* Decline Reason */}
                          {task.decline_reason && (
                            <div className="flex gap-2 p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg animate-in slide-in-from-left-2">
                              <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-destructive">{t("taskStatusDetails.cannotComplete")}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{task.decline_reason}</p>
                              </div>
                            </div>
                          )}

                          {/* Task Progress */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">{t("taskStatusDetails.taskCompletion")}</span>
                              <span className="font-bold">{completionPercentage}%</span>
                            </div>
                            <Progress 
                              value={completionPercentage} 
                              className={cn(
                                "h-2 group-hover:h-2.5 transition-all",
                                task.status === 'completed' ? "[&>div]:bg-success" : "[&>div]:bg-primary"
                              )} 
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialogs */}
        {editingTask && (
          <EditTaskDialog
            taskId={editingTask}
            organizationId={organizationId!}
            open={!!editingTask}
            onOpenChange={(open) => !open && setEditingTask(null)}
            onTaskUpdated={fetchTasks}
          />
        )}

        {viewingReports && (
          <TaskReportsDialog
            taskId={viewingReports}
            open={!!viewingReports}
            onOpenChange={(open) => !open && setViewingReports(null)}
          />
        )}

        <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("taskStatusDetails.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("taskStatusDetails.deleteDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingTask && handleDeleteTask(deletingTask)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("taskStatusDetails.actions.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TaskStatusDetails;
