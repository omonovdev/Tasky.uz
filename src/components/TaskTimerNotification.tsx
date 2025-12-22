import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  startedAt: string;
  estimatedCompletionHours: number;
  status: string;
}

export default function TaskTimerNotification() {
  const [expiredTask, setExpiredTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentUserId(authJwt.getUserId());
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const checkTimers = async () => {
      try {
        const tasks = await api.tasks.list({ all: false });
        const inProgress = (tasks || [])
          .filter((t: any) => t.status === "in_progress")
          .filter((t: any) => Boolean(t.startedAt))
          .filter((t: any) => typeof t.estimatedCompletionHours === "number");

        if (inProgress.length === 0) return;

        const now = new Date();

        // Check each task for expired timer
        for (const rawTask of inProgress) {
          const task: Task = {
            id: rawTask.id,
            title: rawTask.title,
            startedAt: rawTask.startedAt,
            estimatedCompletionHours: rawTask.estimatedCompletionHours,
            status: rawTask.status,
          };

          const startedAt = new Date(task.startedAt);
          const estimatedEndTime = new Date(
            startedAt.getTime() + task.estimatedCompletionHours * 60 * 1000
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
                Estimated time: {Math.floor(expiredTask.estimatedCompletionHours / 60)}h {expiredTask.estimatedCompletionHours % 60}m
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
