import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  position?: string;
}

interface EditTaskDialogProps {
  taskId: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

const EditTaskDialog = ({ taskId, organizationId, open, onOpenChange, onTaskUpdated }: EditTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date>();
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [members, setMembers] = useState<Member[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTaskDetails();
      fetchMembers();
    }
  }, [open, taskId]);

  const fetchTaskDetails = async () => {
    try {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      setTitle(task.title);
      setDescription(task.description || "");
      setGoal(task.goal || "");
      const deadlineDate = new Date(task.deadline);
      setDeadline(deadlineDate);
      setDeadlineTime(format(deadlineDate, "HH:mm"));

      // Fetch task assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from("task_assignments")
        .select("user_id")
        .eq("task_id", taskId);

      if (assignmentError) throw assignmentError;

      setSelectedMembers(assignments.map(a => a.user_id));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          user_id,
          position,
          profiles!inner(first_name, last_name)
        `)
        .eq("organization_id", organizationId);

      if (error) throw error;

      const formattedMembers = data.map((item: any) => ({
        user_id: item.user_id,
        first_name: item.profiles.first_name,
        last_name: item.profiles.last_name,
        position: item.position,
      }));

      setMembers(formattedMembers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMembers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdating(true);

      // Combine date and time for deadline
      let finalDeadline = deadline;
      if (deadline && deadlineTime) {
        const [hours, minutes] = deadlineTime.split(':');
        finalDeadline = new Date(deadline);
        finalDeadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // Update task
      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          goal,
          deadline: finalDeadline?.toISOString(),
        })
        .eq("id", taskId);

      if (taskError) throw taskError;

      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId);

      if (deleteError) throw deleteError;

      // Create new assignments
      const assignments = selectedMembers.map(memberId => ({
        task_id: taskId,
        user_id: memberId,
      }));

      const { error: assignmentError } = await supabase
        .from("task_assignments")
        .insert(assignments);

      if (assignmentError) throw assignmentError;

      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      onOpenChange(false);
      onTaskUpdated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Task Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-goal">Goal</Label>
            <Textarea
              id="edit-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Enter the goal/reason for this task"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Assign To (Select Multiple)</Label>
            <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${member.user_id}`}
                    checked={selectedMembers.includes(member.user_id)}
                    onCheckedChange={() => toggleMember(member.user_id)}
                  />
                  <label
                    htmlFor={`edit-${member.user_id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {member.first_name} {member.last_name} {member.position && `(${member.position})`}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deadline Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 max-h-80 overflow-y-auto" align="start">
                   <div className="p-3">
                     <div className="mb-3 font-semibold">Select Date</div>
                     <div className="space-y-1">
                       {[...Array(7)].map((_, i) => {
                         const date = new Date();
                         date.setDate(date.getDate() + i);
                         return (
                           <Button
                             key={i}
                             variant={deadline && deadline.toDateString() === date.toDateString() ? "default" : "outline"}
                             className="w-full justify-start"
                             onClick={() => setDeadline(date)}
                           >
                             {format(date, "EEE, MMM d")}
                           </Button>
                         );
                       })}
                     </div>
                   </div>
                 </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Deadline Time</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

        </form>
        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-task-form" disabled={isUpdating} className="flex-1">
            {isUpdating ? "Updating..." : "Update Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
