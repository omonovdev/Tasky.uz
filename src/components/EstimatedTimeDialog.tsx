import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface EstimatedTimeDialogProps {
  taskId: string;
  currentEstimate: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEstimateUpdated: () => void;
}

export default function EstimatedTimeDialog({
  taskId,
  currentEstimate,
  open,
  onOpenChange,
  onEstimateUpdated,
}: EstimatedTimeDialogProps) {
  const [hours, setHours] = useState(currentEstimate?.toString() || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const estimatedHours = parseInt(hours);
    if (isNaN(estimatedHours) || estimatedHours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of hours",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ estimated_completion_hours: estimatedHours })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Estimated time updated successfully",
      });

      onOpenChange(false);
      onEstimateUpdated();
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
            <Clock className="h-5 w-5" />
            Set Estimated Completion Time
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Estimated Hours *</Label>
            <Input
              id="hours"
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter number of hours"
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
              disabled={loading || !hours}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Estimate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
