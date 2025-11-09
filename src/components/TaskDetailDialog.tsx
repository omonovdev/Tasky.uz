import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, CheckCircle2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string;
  assigned_by: string;
  assigned_to: string;
  goal: string | null;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDetailDialog = ({ task, open, onOpenChange }: TaskDetailDialogProps) => {
  if (!task) return null;

  const getStatusColor = (status: string) => {
    if (status === "completed") return "bg-success text-success-foreground";
    const now = new Date();
    const deadline = new Date(task.deadline);
    if (deadline < now) return "bg-destructive text-destructive-foreground";
    return "bg-accent text-accent-foreground";
  };

  const getStatusText = (status: string) => {
    if (status === "completed") return "Completed";
    const now = new Date();
    const deadline = new Date(task.deadline);
    if (deadline < now) return "Overdue";
    return "In Progress";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
            <Badge className={getStatusColor(task.status)}>
              {task.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {getStatusText(task.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {task.description && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Description</h4>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          {task.goal && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Goal</h4>
              <p className="text-sm">{task.goal}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Deadline:</span>
            <span className="font-medium">{format(new Date(task.deadline), "MMMM d, yyyy")}</span>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Click outside or press ESC to close
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
