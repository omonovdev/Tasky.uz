import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import EstimatedTimeDialog from "@/components/EstimatedTimeDialog";
import TaskDeclineDialog from "@/components/TaskDeclineDialog";

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
    checkAuth();
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

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks from task_assignments
      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", user.id);

      if (!assignments || assignments.length === 0) {
        setTasks([]);
        return;
      }

      const taskIds = assignments.map(a => a.task_id);

      const { data } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (data) setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const getTaskColor = (task: Task) => {
    if (task.status === "completed") return "bg-success text-success-foreground";
    const now = new Date();
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return "bg-destructive text-destructive-foreground";
    if (hoursLeft < 24) return "bg-destructive text-destructive-foreground";
    if (hoursLeft < 72) return "bg-accent text-accent-foreground";
    return "bg-primary text-primary-foreground";
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
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">View all your tasks by due date</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("day")}
            >
              Day
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterMode === "all" ? "default" : "outline"}
            onClick={() => setFilterMode("all")}
            size="sm"
          >
            Tasks Assigned
          </Button>
          <Button
            variant={filterMode === "completed" ? "default" : "outline"}
            onClick={() => setFilterMode("completed")}
            size="sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Completed
          </Button>
          <Button
            variant={filterMode === "in_progress" ? "default" : "outline"}
            onClick={() => setFilterMode("in_progress")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-1" />
            In Progress
          </Button>
          <Button
            variant={filterMode === "urgent" ? "default" : "outline"}
            onClick={() => setFilterMode("urgent")}
            size="sm"
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            Urgent
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Task Calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-md border pointer-events-auto"
              />
              
              <div className="mt-4 space-y-2 text-sm w-full max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                  <span>Tasks assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }} />
                  <span>All completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                  <span>Deadline missed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {filterMode === "all" && "Tasks Assigned This Month"}
                  {filterMode === "completed" && "Completed Tasks"}
                  {filterMode === "in_progress" && "In Progress"}
                  {filterMode === "urgent" && "Urgent Tasks"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredTasks = getFilteredTasks();
                  const inProgressTasks = filteredTasks.filter(t => t.status !== "completed");
                  const completedTasks = filteredTasks.filter(t => t.status === "completed");
                  
                  if (filteredTasks.length === 0) {
                    return <p className="text-muted-foreground text-sm">No tasks found</p>;
                  }
                  
                  return (
                    <div className="space-y-6">
                      {inProgressTasks.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-base">In Progress</h3>
                          {inProgressTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{task.title}</h4>
                                <Badge className={getTaskColor(task)}>
                                  {task.status}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-xs">
                                <span className="font-semibold">Deadline:</span>{" "}
                                {format(new Date(task.deadline), "MMM d, yyyy HH:mm")}
                              </p>
                              {task.estimated_completion_hours && (
                                <p className="text-xs text-muted-foreground">
                                  Estimated: {task.estimated_completion_hours} hours
                                </p>
                              )}
                              {task.decline_reason && (
                                <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                                  <p className="text-xs font-semibold text-destructive">Cannot Complete:</p>
                                  <p className="text-xs text-muted-foreground">{task.decline_reason}</p>
                                </div>
                              )}
                              <div className="flex gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTaskClick(task)}
                                  className="h-7 text-xs"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEstimatingTask(task)}
                                  className="h-7 text-xs"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  Set Time
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDecliningTask(task)}
                                  className="h-7 text-xs"
                                >
                                  Cannot Complete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {completedTasks.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-semibold text-base">Completed</h3>
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => handleTaskClick(task)}
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                  {task.title}
                                </h4>
                                <Badge className={getTaskColor(task)}>
                                  {task.status}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-xs mt-1">
                                <span className="font-semibold">Completed:</span>{" "}
                                {format(new Date(task.deadline), "MMM d, yyyy")}
                              </p>
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
