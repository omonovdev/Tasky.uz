import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { XCircle } from "lucide-react";

interface TaskDeclineDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeclineSubmitted: () => void;
}

export default function TaskDeclineDialog({
  taskId,
  open,
  onOpenChange,
  onDeclineSubmitted,
}: TaskDeclineDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ decline_reason: reason })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reason submitted successfully",
      });

      setReason("");
      onOpenChange(false);
      onDeclineSubmitted();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Cannot Complete Task
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for not completing *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you cannot complete this task..."
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="flex-1"
              variant="destructive"
            >
              {loading ? "Submitting..." : "Submit Reason"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
