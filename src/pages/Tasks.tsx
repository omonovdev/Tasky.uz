import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, Edit2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import TaskStagesManager from "@/components/TaskStagesManager";
import TaskCompletionReport from "@/components/TaskCompletionReport";
import FireProgress from "@/components/FireProgress";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tasks from task_assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", user.id);

      if (assignmentError) throw assignmentError;

      const taskIds = assignments.map(a => a.task_id);

      if (taskIds.length === 0) {
        setTasks([]);
        setUrgentTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds)
        .order("deadline", { ascending: true });

      if (error) throw error;
      
      if (data) {
        setTasks(data);
        
        // Fetch assigner names
        const uniqueAssignerIds = [...new Set(data.map(t => t.assigned_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", uniqueAssignerIds);
        
        if (profiles) {
          const namesMap: Record<string, string> = {};
          profiles.forEach((profile: any) => {
            namesMap[profile.id] = `${profile.first_name} ${profile.last_name}`;
          });
          setAssignerNames(namesMap);
        }
        
        // Fetch editor names
        const uniqueEditorIds = [...new Set(data.filter(t => t.last_edited_by).map(t => t.last_edited_by!))];
        if (uniqueEditorIds.length > 0) {
          const { data: editorProfiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", uniqueEditorIds);
          
          if (editorProfiles) {
            const editorsMap: Record<string, string> = {};
            editorProfiles.forEach((profile: any) => {
              editorsMap[profile.id] = `${profile.first_name} ${profile.last_name}`;
            });
            setEditorNames(editorsMap);
          }
        }
        
        // Filter urgent tasks (less than 3 days)
        const now = new Date();
        const urgent = data.filter(task => {
          const deadline = new Date(task.deadline);
          const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursLeft < 72 && hoursLeft > 0 && task.status !== "completed"; // Less than 3 days (72 hours)
        });
        setUrgentTasks(urgent);
      }
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
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      toast({
        title: "Success",
        description: "Task status updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
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
      if (overdueDays > 0) return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
      return `Overdue by ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`;
    }
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''} left`;
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
      return `${totalHours} hour${totalHours !== 1 ? 's' : ''} left`;
    }
    
    const totalDays = Math.floor(totalHours / 24);
    return `${totalDays} day${totalDays !== 1 ? 's' : ''} left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading tasks...</p>
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
    <Card key={task.id} className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle>{task.title}</CardTitle>
            {task.description && (
              <CardDescription>{task.description}</CardDescription>
            )}
            {task.goal && (
              <CardDescription className="mt-2">
                <span className="font-semibold">Goal:</span> {task.goal}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace("_", " ")}
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
          <div>Assigned by {assignerNames[task.assigned_by] || "Unknown"} on {formatAssignedDate(task.created_at)}</div>
          {task.last_edited_by && task.last_edited_at && (
            <div className="text-amber-600 dark:text-amber-400">
              Edited by {editorNames[task.last_edited_by] || "Unknown"} on {formatAssignedDate(task.last_edited_at)}
            </div>
          )}
        </div>
        
        {task.status !== "completed" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time Remaining</span>
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
            Stages
          </Button>
          <Button
            onClick={() => updateTaskStatus(task.id, "in_progress")}
            size="sm"
            variant="outline"
            disabled={task.status !== "pending"}
          >
            Start
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
            Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/" />
            <h1 className="text-3xl font-bold">{t("tasks.myTasks")}</h1>
          </div>
          <Badge variant="outline">{tasks.length} total</Badge>
        </div>

        {/* Section Headers */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold text-primary">{inProgressTasks.length}</h2>
              <p className="text-sm text-muted-foreground">To Be Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-6 text-center">
              <h2 className="text-2xl font-bold text-success">{completedTasks.length}</h2>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {!showAllTasks && urgentTasks.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Urgent Tasks ({urgentTasks.length})
              </CardTitle>
              <CardDescription>Tasks with less than 3 days remaining</CardDescription>
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
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {showAllTasks ? "No tasks assigned yet" : "No urgent tasks"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {inProgressTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
                  To Be Completed
                </h2>
                {inProgressTasks.map(renderTask)}
              </div>
            )}
            
            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
                  Completed
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

      <BottomNav />
    </div>
  );
};

export default Tasks;
