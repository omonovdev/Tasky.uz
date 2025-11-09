import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  started_at: string;
  estimated_completion_hours: number;
  status: string;
}

export default function TaskTimerNotification() {
  const [expiredTask, setExpiredTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const checkTimers = async () => {
      try {
        // Get all in-progress tasks assigned to current user
        const { data: assignments } = await supabase
          .from("task_assignments")
          .select("task_id")
          .eq("user_id", currentUserId);

        const taskIds = assignments?.map(a => a.task_id) || [];

        if (taskIds.length === 0) return;

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, started_at, estimated_completion_hours, status")
          .in("id", taskIds)
          .eq("status", "in_progress")
          .not("started_at", "is", null)
          .not("estimated_completion_hours", "is", null);

        if (!tasks || tasks.length === 0) return;

        const now = new Date();

        // Check each task for expired timer
        for (const task of tasks) {
          const startedAt = new Date(task.started_at);
          const estimatedEndTime = new Date(
            startedAt.getTime() + task.estimated_completion_hours * 60 * 60 * 1000
          );

          // Check if timer just expired (within last 2 minutes)
          const timeDiff = now.getTime() - estimatedEndTime.getTime();
          if (timeDiff > 0 && timeDiff < 2 * 60 * 1000) {
            // Check if we haven't already shown notification for this task
            const notificationKey = `timer_shown_${task.id}`;
            const alreadyShown = localStorage.getItem(notificationKey);
            
            if (!alreadyShown) {
              setExpiredTask(task);
              localStorage.setItem(notificationKey, "true");
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error checking timers:", error);
      }
    };

    // Check immediately
    checkTimers();

    // Check every minute
    const interval = setInterval(checkTimers, 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleComplete = () => {
    if (expiredTask) {
      window.location.href = `/task/${expiredTask.id}`;
    }
  };

  const handleDismiss = () => {
    setExpiredTask(null);
    toast({
      title: "Reminder",
      description: "You can complete the task later from the Tasks page",
    });
  };

  if (!expiredTask) return null;

  return (
    <Dialog open={!!expiredTask} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Estimated Time Reached
          </DialogTitle>
          <DialogDescription>
            The estimated time for your task has expired.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-1">{expiredTask.title}</h4>
            <p className="text-sm text-muted-foreground">
              Estimated time: {expiredTask.estimated_completion_hours} hour
              {expiredTask.estimated_completion_hours !== 1 ? "s" : ""}
            </p>
          </div>
          <p className="text-sm">
            Is this task completed? If yes, click the button below to mark it as complete. 
            If not, you can continue working on it.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
            >
              Continue Working
            </Button>
            <Button
              onClick={handleComplete}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Go to Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
