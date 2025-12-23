import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { 
  Calendar, 
  ArrowLeft, 
  Edit, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Target,
  Flame,
  TrendingUp,
  User,
  Sparkles,
  Play,
  AlertCircle,
  Award,
  Zap,
  Timer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskStagesManager from "@/components/TaskStagesManager";
import TaskCompletionReport from "@/components/TaskCompletionReport";
import EstimatedTimeDialog from "@/components/EstimatedTimeDialog";
import TaskDeclineDialog from "@/components/TaskDeclineDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string;
  assigned_by: string;
  assigned_to: string;
  goal: string | null;
  custom_goal: string | null;
  started_at: string | null;
  actual_completed_at: string | null;
  estimated_completion_hours: number | null;
  decline_reason: string | null;
  created_at?: string;
}

interface Profile {
  first_name: string;
  last_name: string;
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [assignerName, setAssignerName] = useState("");
  const [showStagesDialog, setShowStagesDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isEmployeeView, setIsEmployeeView] = useState(false);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [estimateCountdown, setEstimateCountdown] = useState<string | null>(null);

  const formatEstimatedTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const formatCountdown = (endMs: number) => {
    const diff = endMs - Date.now();
    if (diff <= 0) return t("taskDetail.countdownDone");
    const totalSeconds = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) return t("taskDetail.countdownLong", { hours: hrs, minutes: mins, seconds: secs });
    if (mins > 0) return t("taskDetail.countdownMedium", { minutes: mins, seconds: secs });
    return t("taskDetail.countdownShort", { seconds: secs });
  };

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  useEffect(() => {
    if (task?.estimated_completion_hours) {
      const startMs = task.started_at
        ? new Date(task.started_at).getTime()
        : task.created_at
          ? new Date(task.created_at).getTime()
          : null;

      if (!startMs) {
        setEstimateCountdown(null);
        return;
      }
      
      const end = startMs + task.estimated_completion_hours * 60 * 1000;
      const update = () => setEstimateCountdown(formatCountdown(end));
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
    setEstimateCountdown(null);
  }, [task?.estimated_completion_hours, task?.started_at, task?.created_at]);

  const fetchTask = async () => {
    try {
      if (!id) return;
      const data = await api.tasks.get(id);

      const mapped: Task = {
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        deadline: data.deadline,
        assigned_by: data.assignedById,
        assigned_to: data.assignedToId,
        goal: data.goal ?? null,
        custom_goal: data.customGoal ?? null,
        started_at: data.startedAt ?? null,
        actual_completed_at: data.actualCompletedAt ?? null,
        estimated_completion_hours: data.estimatedCompletionHours ?? null,
        decline_reason: data.declineReason ?? null,
        created_at: data.createdAt,
      };

      setTask(mapped);

      const assigner = data.assignedBy
        ? `${data.assignedBy.firstName || ""} ${data.assignedBy.lastName || ""}`.trim()
        : "";
      setAssignerName(assigner);

      const stages = data.stages || [];
      if (stages.length > 0) {
        const completedStages = stages.filter((s: any) => s.status === "completed").length;
        setCompletionPercentage(Math.round((completedStages / stages.length) * 100));
      } else {
        setCompletionPercentage(0);
      }

      const meId = authJwt.getUserId();
      setIsEmployeeView(Boolean(meId && data.assignedToId === meId));
    } catch (error) {
      console.error("Error fetching task:", error);
      toast({
        title: t("common.error"),
        description: t("taskDetail.loadError"),
        variant: "destructive",
      });
    }
  };

  const handleStartTask = async () => {
    if (!task?.estimated_completion_hours) {
      setShowEstimateDialog(true);
      return;
    }

    try {
      if (!id) return;
      await api.tasks.updateStatus(id, { status: "in_progress" });
      localStorage.removeItem(`timer_shown_${id}`);

      toast({
        title: t("common.success"),
        description: t("taskDetail.startSuccess"),
      });
      fetchTask();
    } catch (error) {
      console.error("Error starting task:", error);
      toast({
        title: t("common.error"),
        description: t("taskDetail.startError"),
        variant: "destructive",
      });
    }
  };

  const handleEstimateSet = async () => {
    setShowEstimateDialog(false);
    await fetchTask();
    handleStartTask();
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">{t("taskDetail.loading")}</p>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string): "pending" | "inProgress" | "completed" => {
    if (status === "completed") return "completed";
    if (status === "in_progress") return "inProgress";
    return "pending";
  };

  const getStatusText = (status: string) => {
    if (status === "completed") return t("taskDetail.status.completed");
    const now = new Date();
    const deadline = new Date(task.deadline);
    if (deadline < now) return t("taskDetail.status.overdue");
    return status === "in_progress" ? t("taskDetail.status.inProgress") : t("taskDetail.status.pending");
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: t("taskDetail.timeRemaining.overdue"), urgent: true };
    if (diffDays === 0) return { text: t("taskDetail.timeRemaining.today"), urgent: true };
    if (diffDays === 1) return { text: t("taskDetail.timeRemaining.oneDay"), urgent: true };
    if (diffDays <= 3) return { text: t("taskDetail.timeRemaining.daysLeft", { count: diffDays }), urgent: true };
    return { text: t("taskDetail.timeRemaining.daysLeft", { count: diffDays }), urgent: false };
  };

  const getUrgencyLevel = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (task.status === 'completed') return 'completed';
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'critical';
    if (hoursLeft < 72) return 'urgent';
    return 'normal';
  };

  const urgency = getUrgencyLevel();
  const timeInfo = getTimeRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-success/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t("taskDetail.back")}
          </Button>
          
          <Badge 
            variant={getStatusVariant(task.status)}
            className="text-sm px-4 py-2 animate-in zoom-in"
          >
            {task.status === "completed" && <Award className="h-4 w-4 mr-1.5" />}
            {task.status === "in_progress" && <Zap className="h-4 w-4 mr-1.5" />}
            {task.status === "pending" && <Clock className="h-4 w-4 mr-1.5" />}
            {getStatusText(task.status)}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Title Card with Gradient */}
          <Card className={cn(
            "relative overflow-hidden border-2 transition-all duration-300",
            urgency === 'overdue' && "border-destructive/40",
            urgency === 'critical' && "border-destructive/30",
            urgency === 'urgent' && "border-amber-500/30",
            urgency === 'normal' && "border-primary/20",
            urgency === 'completed' && "border-success/30"
          )}>
            {/* Gradient Overlay */}
            <div className={cn(
              "absolute inset-0 opacity-10",
              urgency === 'overdue' && "bg-gradient-to-br from-destructive/30 to-transparent",
              urgency === 'critical' && "bg-gradient-to-br from-destructive/20 to-transparent",
              urgency === 'urgent' && "bg-gradient-to-br from-amber-500/20 to-transparent",
              urgency === 'normal' && "bg-gradient-to-br from-primary/20 to-transparent",
              urgency === 'completed' && "bg-gradient-to-br from-success/20 to-transparent"
            )} />

            {/* Background Icon */}
            <div className="absolute top-0 right-0 w-64 h-64 -translate-y-1/3 translate-x-1/3 opacity-5">
              <Target className="w-full h-full" />
            </div>

            <CardContent className="relative pt-8 pb-6 px-8">
              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "p-4 rounded-2xl",
                  urgency === 'overdue' && "bg-destructive/10",
                  urgency === 'critical' && "bg-destructive/10",
                  urgency === 'urgent' && "bg-amber-500/10",
                  urgency === 'normal' && "bg-primary/10",
                  urgency === 'completed' && "bg-success/10"
                )}>
                  {urgency === 'overdue' || urgency === 'critical' ? (
                    <Flame className={cn("h-8 w-8", urgency === 'overdue' && "text-destructive animate-pulse", urgency === 'critical' && "text-destructive")} />
                  ) : urgency === 'urgent' ? (
                    <AlertCircle className="h-8 w-8 text-amber-500" />
                  ) : urgency === 'completed' ? (
                    <Award className="h-8 w-8 text-success" />
                  ) : (
                    <Target className="h-8 w-8 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl font-black mb-3 leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {task.title}
                  </h1>
                  {task.description && (
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Goal Section */}
              {(task.goal || task.custom_goal) && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm text-primary mb-1">{t("taskDetail.goalTitle")}</h3>
                      <p className="text-foreground">{task.custom_goal || task.goal}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Deadline Card */}
                <div className={cn(
                  "group relative overflow-hidden rounded-xl p-4 border-2 transition-all hover:scale-105",
                  urgency === 'overdue' && "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/40",
                  urgency === 'critical' && "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30",
                  urgency === 'urgent' && "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30",
                  urgency === 'normal' && "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30",
                  urgency === 'completed' && "bg-gradient-to-br from-success/10 to-success/5 border-success/30"
                )}>
                  <div className="absolute -right-2 -top-2 opacity-10 rotate-12">
                    <Calendar className="h-16 w-16" />
                  </div>
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className={cn(
                        "h-4 w-4",
                        urgency === 'overdue' && "text-destructive animate-pulse",
                        urgency === 'critical' && "text-destructive",
                        urgency === 'urgent' && "text-amber-600",
                        urgency === 'normal' && "text-primary",
                        urgency === 'completed' && "text-success"
                      )} />
                      <span className="text-xs font-medium text-muted-foreground">{t("taskDetail.timeLeft")}</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-black leading-none",
                      urgency === 'overdue' && "text-destructive animate-pulse",
                      urgency === 'critical' && "text-destructive",
                      urgency === 'urgent' && "text-amber-600",
                      urgency === 'normal' && "text-primary",
                      urgency === 'completed' && "text-success"
                    )}>
                      {timeInfo.text}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.deadline), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                {/* Assigned By Card */}
                <div className="group relative overflow-hidden rounded-xl p-4 border-2 border-border bg-gradient-to-br from-muted/50 to-transparent hover:scale-105 transition-all">
                  <div className="absolute -right-2 -top-2 opacity-5 rotate-12">
                    <User className="h-16 w-16" />
                  </div>
                  <div className="relative space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">{t("taskDetail.assignedBy")}</span>
                    </div>
                    <p className="text-xl font-bold">{assignerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.deadline), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Estimated Time Card */}
                {task.estimated_completion_hours && (
                  <div className="group relative overflow-hidden rounded-xl p-4 border-2 border-border bg-gradient-to-br from-primary/5 to-transparent hover:scale-105 transition-all">
                    <div className="absolute -right-2 -top-2 opacity-5 rotate-12">
                      <Timer className="h-16 w-16" />
                    </div>
                    <div className="relative space-y-2">
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">{t("taskDetail.estimated")}</span>
                      </div>
                      <p className="text-2xl font-black text-primary">
                        {formatEstimatedTime(task.estimated_completion_hours)}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <p>{t("taskDetail.workDuration")}</p>
                        {estimateCountdown && (
                          <p className="text-[11px] text-success mt-1 font-semibold">
                            {estimateCountdown}
                          </p>
                        )}
                        {!estimateCountdown && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {t("taskDetail.countdownHint")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Section */}
              {completionPercentage > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-bold text-lg">{t("taskDetail.progressTitle")}</span>
                    </div>
                    <span className="text-3xl font-black text-primary">{completionPercentage}%</span>
                  </div>
                  <Progress 
                    value={completionPercentage} 
                    className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/50" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("taskDetail.progressHint")}
                  </p>
                </div>
              )}

              {/* Decline Reason */}
              {task.decline_reason && (
                <div className="mt-6 p-4 rounded-xl bg-destructive/10 border-l-4 border-destructive animate-in slide-in-from-left-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-destructive mb-1">{t("taskDetail.declineReason")}</p>
                      <p className="text-sm text-foreground">{task.decline_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowStagesDialog(true)}
                  className="group border-success text-success hover:bg-success hover:text-success-foreground"
                >
                  <Edit className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                  {t("taskDetail.buttons.manageStages")}
                </Button>

                {!task.estimated_completion_hours && task.status !== "completed" && (
                  <Button
                    variant="outline"
                  onClick={() => setShowEstimateDialog(true)}
                  className="group"
                >
                  <Clock className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  {t("taskDetail.buttons.setEstimate")}
                </Button>
              )}

                {!task.started_at && task.status !== "completed" && (
                  <Button 
                  onClick={handleStartTask}
                  className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  {t("taskDetail.buttons.startTask")}
                </Button>
              )}

                {task.status !== "completed" && isEmployeeView && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeclineDialog(true)}
                    className="group border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <XCircle className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                    {t("taskDetail.buttons.cannotComplete")}
                  </Button>
                )}

                {task.status !== "completed" && (
                  <Button 
                    onClick={() => setShowCompletionDialog(true)}
                    className="group bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 disabled:from-green-400 disabled:to-green-400 disabled:text-white disabled:opacity-80 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 border border-green-500"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    {t("taskDetail.buttons.markComplete")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showStagesDialog} onOpenChange={(open) => {
        setShowStagesDialog(open);
        if (!open) fetchCompletionPercentage();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <TaskStagesManager taskId={id!} isEmployeeView={isEmployeeView} />
        </DialogContent>
      </Dialog>

      <Dialog open={showCompletionDialog} onOpenChange={(open) => {
        setShowCompletionDialog(open);
        if (!open) fetchTask();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <TaskCompletionReport 
            taskId={id!} 
            onReportSubmitted={() => {
              setShowCompletionDialog(false);
              fetchTask();
              toast({
                title: t("common.success"),
                description: t("taskDetail.completeSuccess"),
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {task && (
        <>
          <EstimatedTimeDialog
            taskId={task.id}
            currentEstimate={task.estimated_completion_hours}
            open={showEstimateDialog}
            onOpenChange={setShowEstimateDialog}
            onEstimateUpdated={handleEstimateSet}
          />

          <TaskDeclineDialog
            taskId={task.id}
            open={showDeclineDialog}
            onOpenChange={setShowDeclineDialog}
            onDeclineSubmitted={() => {
              setShowDeclineDialog(false);
              fetchTask();
            }}
          />
        </>
      )}
    </div>
  );
}
