import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, Edit2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/BackButton";

import TaskStagesManager from "@/components/TaskStagesManager";
import TaskCompletionReport from "@/components/TaskCompletionReport";
import FireProgress from "@/components/FireProgress";
import WinterBackground from "@/components/WinterBackground";

interface Task {
  id: string;
  title: string;
  description: string;
  goal: string;
  deadline: string;
  status: string;
  created_at: string;
  assigned_by: string;
  last_edited_by?: string;
  last_edited_at?: string;
}

interface Profile {
  first_name: string;
  last_name: string;
}

const Tasks = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignerNames, setAssignerNames] = useState<Record<string, string>>({});
  const [editorNames, setEditorNames] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const apiTasks = await api.tasks.list({ all: false });
      const mapped: Task[] = (apiTasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        goal: t.goal || "",
        deadline: t.deadline,
        status: t.status,
        created_at: t.createdAt,
        assigned_by: t.assignedById,
        last_edited_by: t.lastEditedBy ?? undefined,
        last_edited_at: t.lastEditedAt ?? undefined,
      }));

      const assignerMap: Record<string, string> = {};
      const editorMap: Record<string, string> = {};
      (apiTasks || []).forEach((t: any) => {
        if (t.assignedById && t.assignedBy) {
          const name = `${t.assignedBy.firstName || ""} ${t.assignedBy.lastName || ""}`.trim();
          if (name) assignerMap[t.assignedById] = name;
        }

        if (t.lastEditedBy) {
          const candidates = [
            t.assignedBy,
            t.assignedTo,
            ...(t.assignments || []).map((a: any) => a.user).filter(Boolean),
          ].filter(Boolean);
          const found = candidates.find((u: any) => u.id === t.lastEditedBy);
          if (found) {
            const name = `${found.firstName || ""} ${found.lastName || ""}`.trim();
            if (name) editorMap[t.lastEditedBy] = name;
          }
        }
      });

      setAssignerNames(assignerMap);
      setEditorNames(editorMap);
      setTasks(mapped);

      const now = new Date();
      const urgent = mapped.filter((task) => {
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft < 72 && hoursLeft > 0 && task.status !== "completed";
      });
      setUrgentTasks(urgent);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.tasks.updateStatus(taskId, { status: newStatus });

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast({
        title: t("common.success"),
        description: t("tasksPage.statusUpdated"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in_progress":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getHoursRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursLeft;
  };

  const getTimeProgress = (createdAt: string, deadline: string) => {
    const now = new Date();
    const start = new Date(createdAt);
    const end = new Date(deadline);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getDeadlineColor = (deadline: string) => {
    const hoursLeft = getHoursRemaining(deadline);
    if (hoursLeft <= 24) return "text-destructive";
    if (hoursLeft <= 72) return "text-accent";
    return "text-muted-foreground";
  };

  const formatDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (totalMinutes < 0) {
      const overdueDays = Math.floor(Math.abs(totalMinutes) / (60 * 24));
      const overdueHours = Math.floor(Math.abs(totalMinutes) / 60);
      if (overdueDays > 0) return t("tasksPage.overdueDays", { count: overdueDays });
      return t("tasksPage.overdueHours", { count: overdueHours });
    }
    
    if (totalMinutes < 60) {
      return t("tasksPage.minutesLeft", { count: totalMinutes });
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
      return t("tasksPage.hoursLeft", { count: totalHours });
    }
    
    const totalDays = Math.floor(totalHours / 24);
    return t("tasksPage.daysLeft", { count: totalDays });
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center relative">
        <WinterBackground />
        <p className="text-muted-foreground relative z-10">{t("tasksPage.loading")}</p>
      </div>
    );
  }

  const displayTasks = showAllTasks ? tasks : urgentTasks;

  const completedTasks = displayTasks.filter(t => t.status === "completed");
  const inProgressTasks = displayTasks.filter(t => t.status !== "completed");

  const formatAssignedDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const renderTask = (task: Task) => (
    <Card key={task.id} className="relative border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle>{task.title}</CardTitle>
            {task.description && (
              <CardDescription>{task.description}</CardDescription>
            )}
            {task.goal && (
              <CardDescription className="mt-2">
                <span className="font-semibold">{t("tasksPage.goal")}:</span> {task.goal}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status === "completed" ? t("tasks.completed") : task.status === "in_progress" ? t("tasks.inProgress") : t("tasks.pending")}
            </Badge>
            {task.status === "completed" && (
              <div className="bg-success rounded-full p-1">
                <CheckCircle2 className="w-5 h-5 text-success-foreground" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-0.5">
          <div>
            {t("tasksPage.assignedByOn", { name: assignerNames[task.assigned_by] || t("tasksPage.unknown"), date: formatAssignedDate(task.created_at) })}
          </div>
          {task.status !== "completed" && task.last_edited_by && task.last_edited_at && (
            <div className="text-amber-600 dark:text-amber-400">
              {t("tasksPage.editedByOn", { name: editorNames[task.last_edited_by] || t("tasksPage.unknown"), date: formatAssignedDate(task.last_edited_at) })}
            </div>
          )}
        </div>
        
        {task.status !== "completed" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("tasksPage.timeRemaining")}</span>
              <span className="font-bold text-destructive text-base">
                {formatDeadline(task.deadline)}
              </span>
            </div>
            <FireProgress deadline={task.deadline} createdAt={task.created_at} />
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setSelectedTask(task.id)}
            size="sm"
            variant="outline"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {t("tasksPage.stages")}
          </Button>
          <Button
            onClick={() => updateTaskStatus(task.id, "in_progress")}
            size="sm"
            variant="outline"
            disabled={task.status !== "pending"}
          >
            {t("tasksPage.start")}
          </Button>
          <Button
            onClick={() => {
              setSelectedTask(task.id);
              setShowReportDialog(true);
            }}
            size="sm"
            disabled={task.status === "completed"}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {t("tasksPage.complete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-20 relative">
      <WinterBackground />
      <div className="container max-w-2xl mx-auto px-4 py-4 md:p-4 space-y-4 md:space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <BackButton to="/" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t("tasks.myTasks")}</h1>
          </div>
          <Badge variant="outline">{t("tasksPage.totalCount", { count: tasks.length })}</Badge>
        </div>

        {/* Section Headers */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-0 ring-1 ring-primary/30 shadow-lg">
            <CardContent className="pt-4 sm:pt-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">{inProgressTasks.length}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{t("tasksPage.toBeCompleted")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-0 ring-1 ring-success/30 shadow-lg">
            <CardContent className="pt-4 sm:pt-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-success">{completedTasks.length}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">{t("tasksPage.completed")}</p>
            </CardContent>
          </Card>
        </div>

        {!showAllTasks && urgentTasks.length > 0 && (
          <Card className="border-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl ring-1 ring-destructive/40 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                {t("tasksPage.urgentTitle", { count: urgentTasks.length })}
              </CardTitle>
              <CardDescription>{t("tasksPage.urgentSubtitle")}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => setShowAllTasks(!showAllTasks)}
            variant={!showAllTasks ? "default" : "outline"}
          >
            {showAllTasks ? t("notifications.filterAll") : t("tasks.myTasks")}
          </Button>
        </div>

        {displayTasks.length === 0 ? (
          <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {showAllTasks ? t("tasksPage.emptyAll") : t("tasksPage.emptyUrgent")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {inProgressTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl py-2 z-10 border-b border-white/30">
                  {t("tasksPage.toBeCompleted")}
                </h2>
                {inProgressTasks.map(renderTask)}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl py-2 z-10 border-b border-white/30">
                  {t("tasksPage.completed")}
                </h2>
                {completedTasks.map(renderTask)}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={selectedTask !== null && !showReportDialog} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTask && <TaskStagesManager taskId={selectedTask} isEmployeeView={true} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          {selectedTask && (
            <TaskCompletionReport
              taskId={selectedTask}
              onReportSubmitted={() => {
                setShowReportDialog(false);
                setSelectedTask(null);
                fetchTasks();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Tasks;
