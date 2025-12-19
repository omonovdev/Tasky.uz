import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authState } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Clock, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import EstimatedTimeDialog from "@/components/EstimatedTimeDialog";
import TaskDeclineDialog from "@/components/TaskDeclineDialog";
import { useTranslation } from "react-i18next";
import WinterBackground from "@/components/WinterBackground";

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string;
  description: string | null;
  assigned_by: string;
  assigned_to: string;
  goal: string | null;
  estimated_completion_hours: number | null;
  decline_reason: string | null;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [filterMode, setFilterMode] = useState<"all" | "completed" | "in_progress" | "urgent">("all");
  const [estimatingTask, setEstimatingTask] = useState<Task | null>(null);
  const [decliningTask, setDecliningTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!authState.isLoggedIn()) navigate("/auth");
    fetchTasks();
  }, []);

  useEffect(() => {
    if (date) {
      const tasksForDate = tasks.filter((task) =>
        isSameDay(new Date(task.deadline), date)
      );
      setSelectedDateTasks(tasksForDate);
    }
  }, [date, tasks]);

  const fetchTasks = async () => {
    try {
      const data = await api.tasks.list({ all: false });
      const mapped: Task[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        deadline: t.deadline,
        description: t.description ?? null,
        assigned_by: t.assignedById,
        assigned_to: t.assignedToId,
        goal: t.goal ?? null,
        estimated_completion_hours: t.estimatedCompletionHours ?? null,
        decline_reason: t.declineReason ?? null,
      }));
      setTasks(mapped);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const getTaskColor = (task: Task) => {
    if (task.status === "completed") return "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/30";
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/30";
    if (hoursLeft < 24) return "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/30";
    if (hoursLeft < 72) return "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30";
    return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/30";
  };

  const getDateColor = (date: Date) => {
    const dayTasks = tasks.filter(task => 
      isSameDay(new Date(task.deadline), date)
    );
    
    if (dayTasks.length === 0) return undefined;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    const allCompleted = dayTasks.every(task => task.status === "completed");
    const hasIncomplete = dayTasks.some(task => task.status !== "completed");
    const isPastDeadline = checkDate < now;
    
    // Red: past deadline with incomplete tasks
    if (isPastDeadline && hasIncomplete) return "hsl(var(--destructive))";
    
    // Green: all tasks completed
    if (allCompleted) return "hsl(var(--success))";
    
    // Blue: has assigned tasks (not all completed, not overdue)
    return "hsl(var(--primary))";
  };

  const getFilteredTasks = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let filtered = tasks;
    
    if (filterMode === "all") {
      filtered = tasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return taskDate >= firstDayOfMonth && taskDate <= now;
      });
    } else if (filterMode === "completed") {
      filtered = tasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return task.status === "completed" && 
               taskDate.getMonth() === now.getMonth() && 
               taskDate.getFullYear() === now.getFullYear();
      });
    } else if (filterMode === "in_progress") {
      filtered = tasks.filter(task => task.status !== "completed");
    } else if (filterMode === "urgent") {
      filtered = tasks.filter(task => {
        const deadline = new Date(task.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft < 72 && hoursLeft > 0 && task.status !== "completed";
      });
    }
    
    return filtered;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  // Convert minutes to hours and minutes display
  const formatEstimatedTime = (minutes: number | null) => {
    if (!minutes) return null;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const taskDates = tasks.map(task => new Date(task.deadline));
  const modifiers = {
    hasTask: taskDates
  };

  const modifiersStyles = {
    hasTask: (date: Date) => {
      const color = getDateColor(date);
      return color ? {
        backgroundColor: color,
        color: 'white',
        borderRadius: '50%'
      } : undefined;
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container max-w-6xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header with gradient background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/90 via-purple-600/90 to-pink-600/90 backdrop-blur-xl p-8 shadow-2xl ring-1 ring-white/20">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1 drop-shadow-lg">{t("calendarPage.title")}</h1>
                <p className="text-white/90 text-lg">{t("calendarPage.subtitle")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={`transition-all duration-300 ${
                  viewMode === "month" 
                    ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg" 
                    : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {t("calendarPage.month")}
              </Button>
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={`transition-all duration-300 ${
                  viewMode === "week" 
                    ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg" 
                    : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {t("calendarPage.week")}
              </Button>
              <Button
                variant={viewMode === "day" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                className={`transition-all duration-300 ${
                  viewMode === "day" 
                    ? "bg-white text-purple-600 hover:bg-white/90 shadow-lg" 
                    : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {t("calendarPage.day")}
              </Button>
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterMode === "all" ? "default" : "outline"}
            onClick={() => setFilterMode("all")}
            size="sm"
            className={`transition-all duration-300 ${
              filterMode === "all"
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-purple-500/30"
                : "hover:scale-105 hover:shadow-md"
            }`}
          >
            {t("calendarPage.filterAssigned")}
          </Button>
          <Button
            variant={filterMode === "completed" ? "default" : "outline"}
            onClick={() => setFilterMode("completed")}
            size="sm"
            className={`transition-all duration-300 ${
              filterMode === "completed"
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/30"
                : "hover:scale-105 hover:shadow-md"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {t("calendarPage.filterCompleted")}
          </Button>
          <Button
            variant={filterMode === "in_progress" ? "default" : "outline"}
            onClick={() => setFilterMode("in_progress")}
            size="sm"
            className={`transition-all duration-300 ${
              filterMode === "in_progress"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
                : "hover:scale-105 hover:shadow-md"
            }`}
          >
            <Clock className="w-4 h-4 mr-1" />
            {t("calendarPage.filterInProgress")}
          </Button>
          <Button
            variant={filterMode === "urgent" ? "default" : "outline"}
            onClick={() => setFilterMode("urgent")}
            size="sm"
            className={`transition-all duration-300 ${
              filterMode === "urgent"
                ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/30"
                : "hover:scale-105 hover:shadow-md"
            }`}
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            {t("calendarPage.filterUrgent")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("calendarPage.taskCalendar")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  setDate(selectedDate);
                  if (selectedDate) {
                    const filtered = tasks
                      .filter((t) => isSameDay(new Date(t.deadline), selectedDate))
                      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
                    setSelectedDateTasks(filtered);
                  } else {
                    setSelectedDateTasks([]);
                  }
                }}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-xl border-0 shadow-sm"
              />
              
              <div className="mt-6 space-y-3 text-sm w-full max-w-xs bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl">
                <div className="flex items-center gap-3 group cursor-default transition-all duration-300 hover:translate-x-1">
                  <div className="w-5 h-5 rounded-full shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md bg-primary" />
                  <span className="font-medium">{t("calendarPage.legendAssigned")}</span>
                </div>
                <div className="flex items-center gap-3 group cursor-default transition-all duration-300 hover:translate-x-1">
                  <div className="w-5 h-5 rounded-full shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md bg-success" />
                  <span className="font-medium">{t("calendarPage.legendCompleted")}</span>
                </div>
                <div className="flex items-center gap-3 group cursor-default transition-all duration-300 hover:translate-x-1">
                  <div className="w-5 h-5 rounded-full shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md bg-destructive" />
                  <span className="font-medium">{t("calendarPage.legendMissed")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {date ? t("calendarPage.tasksOnDate", { date: format(date, "MMM d, yyyy") }) : t("calendarPage.selectDate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  // Only show tasks for the selected date
                  const filteredTasks = selectedDateTasks;
                  const inProgressTasks = filteredTasks.filter(t => t.status !== "completed");
                  const completedTasks = filteredTasks.filter(t => t.status === "completed");

                  if (filteredTasks.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                          <CalendarIcon className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">{t("calendarPage.emptyTitle")}</p>
                        <p className="text-muted-foreground text-xs mt-1">{t("calendarPage.emptySubtitle")}</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-6">
                      {inProgressTasks.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {t("calendarPage.inProgress")}
                          </h3>
                          {inProgressTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-4 border-0 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm">{task.title}</h4>
                                <Badge className={`${getTaskColor(task)} transition-all duration-300 hover:scale-105`}>
                                  {task.status}
                                </Badge>
                              </div>
                              {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-xs">
                                <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t("calendarPage.deadline")}:</span>{" "}
                                {format(new Date(task.deadline), "MMM d, yyyy HH:mm")}
                              </p>
                              {task.estimated_completion_hours && (
                                <p className="text-xs text-muted-foreground">
                                  {t("calendarPage.estimated")} {formatEstimatedTime(task.estimated_completion_hours)}
                                </p>
                              )}
                              {task.decline_reason && (
                                <div className="mt-2 p-3 bg-gradient-to-br from-red-50 to-rose-100 rounded-lg border border-red-200">
                                  <p className="text-xs font-semibold text-red-700">{t("calendarPage.cannotComplete")}</p>
                                  <p className="text-xs text-red-600 mt-1">{task.decline_reason}</p>
                                </div>
                              )}
                              <div className="flex gap-2 flex-wrap pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/task/${task.id}`)}
                                  className="h-8 text-xs transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                                >
                                  {t("calendarPage.view")}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEstimatingTask(task)}
                                  className="h-8 text-xs transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {t("calendarPage.setTime")}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {completedTasks.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-base bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                            {t("calendarPage.completed")}
                          </h3>
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-4 border-0 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                              onClick={() => handleTaskClick(task)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  {task.title}
                                </h4>
                                <Badge className={`${getTaskColor(task)} transition-all duration-300 hover:scale-105`}>
                                  {task.status}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-xs mt-2">
                                <span className="font-semibold text-emerald-700">{t("calendarPage.completedLabel")}:</span>{" "}
                                {format(new Date(task.deadline), "MMM d, yyyy")}
                              </p>
                              {task.estimated_completion_hours && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("calendarPage.estimated")} {formatEstimatedTime(task.estimated_completion_hours)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      
      {estimatingTask && (
        <EstimatedTimeDialog
          taskId={estimatingTask.id}
          currentEstimate={estimatingTask.estimated_completion_hours}
          open={!!estimatingTask}
          onOpenChange={(open) => !open && setEstimatingTask(null)}
          onEstimateUpdated={() => {
            setEstimatingTask(null);
            fetchTasks();
          }}
        />
      )}
      
      {decliningTask && (
        <TaskDeclineDialog
          taskId={decliningTask.id}
          open={!!decliningTask}
          onOpenChange={(open) => !open && setDecliningTask(null)}
          onDeclineSubmitted={() => {
            setDecliningTask(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};

export default CalendarView;
