import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, ArrowLeft, Edit, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TaskStagesManager from "@/components/TaskStagesManager";
import TaskCompletionReport from "@/components/TaskCompletionReport";
import EstimatedTimeDialog from "@/components/EstimatedTimeDialog";
import TaskDeclineDialog from "@/components/TaskDeclineDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

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
}

interface Profile {
  first_name: string;
  last_name: string;
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [assignerName, setAssignerName] = useState("");
  const [showStagesDialog, setShowStagesDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isEmployeeView, setIsEmployeeView] = useState(false);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask();
      fetchCompletionPercentage();
      checkIfEmployee();
    }
  }, [id]);

  const checkIfEmployee = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("tasks")
        .select("assigned_to, assigned_by")
        .eq("id", id)
        .single();

      if (data) {
        setIsEmployeeView(data.assigned_to === user.id);
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    }
  };

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTask(data);

      // Fetch assigner name
      const { data: assignerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", data.assigned_by)
        .single();

      if (assignerProfile) {
        setAssignerName(`${assignerProfile.first_name} ${assignerProfile.last_name}`);
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      toast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive",
      });
    }
  };

  const fetchCompletionPercentage = async () => {
    try {
      const { data: stages } = await supabase
        .from("task_stages")
        .select("status")
        .eq("task_id", id);

      if (stages && stages.length > 0) {
        const completedStages = stages.filter(s => s.status === "completed").length;
        const percentage = Math.round((completedStages / stages.length) * 100);
        setCompletionPercentage(percentage);
      }
    } catch (error) {
      console.error("Error fetching completion:", error);
    }
  };

  const handleStartTask = async () => {
    // Check if estimated time is set
    if (!task?.estimated_completion_hours) {
      setShowEstimateDialog(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ started_at: new Date().toISOString(), status: "in_progress" })
        .eq("id", id);

      if (error) throw error;

      // Clear any previous timer notification flag
      localStorage.removeItem(`timer_shown_${id}`);

      toast({
        title: "Success",
        description: "Task started successfully. Timer is running!",
      });
      fetchTask();
    } catch (error) {
      console.error("Error starting task:", error);
      toast({
        title: "Error",
        description: "Failed to start task",
        variant: "destructive",
      });
    }
  };

  const handleEstimateSet = async () => {
    setShowEstimateDialog(false);
    await fetchTask();
    // Now start the task after estimate is set
    handleStartTask();
  };

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const getStatusVariant = (status: string): "pending" | "inProgress" | "completed" => {
    if (status === "completed") return "completed";
    if (status === "in_progress") return "inProgress";
    return "pending";
  };

  const getStatusText = (status: string) => {
    if (status === "completed") return "Completed";
    const now = new Date();
    const deadline = new Date(task.deadline);
    if (deadline < now) return "Overdue";
    return status === "in_progress" ? "In Progress" : "Pending";
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day left";
    return `${diffDays} days left`;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
              <Badge variant={getStatusVariant(task.status)}>
                {task.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {getStatusText(task.status)}
              </Badge>
            </div>
          </div>

          {task.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Description</h3>
              <p className="text-base">{task.description}</p>
            </div>
          )}

          {(task.goal || task.custom_goal) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Goal</h3>
              <p className="text-base">{task.custom_goal || task.goal}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Deadline:</span>
              <span className="font-medium">{format(new Date(task.deadline), "MMMM d, yyyy")}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Time Remaining:</span>
              <span className={`font-medium ${getTimeRemaining() === "Overdue" ? "text-destructive" : "text-orange-500"}`}>
                {getTimeRemaining()}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              Assigned by {assignerName} on {format(new Date(task.deadline), "MMM d, yyyy")}
            </p>
          </div>

          {completionPercentage > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Task Completion</span>
                <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          )}

          {task.estimated_completion_hours && (
            <div className="mb-6 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Estimated Time:</span>
                <span className="text-sm">{task.estimated_completion_hours} hour{task.estimated_completion_hours !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {task.decline_reason && (
            <div className="mb-6 p-3 border-l-4 border-destructive bg-destructive/10 rounded">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">Cannot Complete - Reason:</p>
                  <p className="text-sm">{task.decline_reason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStagesDialog(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Stages
            </Button>

            {!task.estimated_completion_hours && task.status !== "completed" && (
              <Button
                variant="outline"
                onClick={() => setShowEstimateDialog(true)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Set Estimated Time
              </Button>
            )}

            {!task.started_at && task.status !== "completed" && (
              <Button onClick={handleStartTask}>
                Start
              </Button>
            )}

            {task.status !== "completed" && isEmployeeView && (
              <Button 
                variant="outline"
                onClick={() => setShowDeclineDialog(true)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cannot Complete
              </Button>
            )}

            {task.status !== "completed" && (
              <Button onClick={() => setShowCompletionDialog(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </Card>
      </div>

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
                title: "Success",
                description: "Task completed successfully",
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
