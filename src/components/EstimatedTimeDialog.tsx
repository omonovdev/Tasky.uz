import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, Sparkles } from "lucide-react";

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
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  // Convert total minutes to hours and minutes when dialog opens
  useEffect(() => {
    if (open && currentEstimate !== null) {
      const totalMinutes = currentEstimate; // Stored as total minutes
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      setHours(hrs.toString());
      setMinutes(mins.toString());
      setShowSuccess(false);
    } else if (open) {
      setHours("0");
      setMinutes("0");
      setShowSuccess(false);
    }
  }, [open, currentEstimate]);

  const getTotalMinutes = () => {
    const hrs = parseInt(hours) || 0;
    const mins = parseInt(minutes) || 0;
    return (hrs * 60) + mins;
  };

  const handleSubmit = async () => {
    const totalMinutes = getTotalMinutes();
    
    if (totalMinutes <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid time estimate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.tasks.update(taskId, { estimatedCompletionHours: totalMinutes });

      setShowSuccess(true);
      
      toast({
        title: "Success",
        description: "Estimated time updated successfully",
      });

      setTimeout(() => {
        onOpenChange(false);
        onEstimateUpdated();
      }, 800);
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

  const getEstimateLabel = () => {
    const totalMinutes = getTotalMinutes();
    const hrs = parseInt(hours) || 0;
    const mins = parseInt(minutes) || 0;
    
    if (totalMinutes === 0) return "";
    
    let timeStr = "";
    if (hrs > 0) timeStr += `${hrs}h `;
    if (mins > 0) timeStr += `${mins}m`;
    
    if (totalMinutes < 60) return `${timeStr.trim()} - Quick task`;
    if (totalMinutes < 240) return `${timeStr.trim()} - Short task`;
    if (totalMinutes < 480) return `${timeStr.trim()} - Few hours`;
    if (totalMinutes < 1440) return `${timeStr.trim()} - Half to full day`;
    if (totalMinutes < 2400) return `${timeStr.trim()} - About a week`;
    return `${timeStr.trim()} - Long-term project`;
  };

  const setQuickTime = (hrs: number, mins: number = 0) => {
    setHours(hrs.toString());
    setMinutes(mins.toString());
  };

  const handleHoursChange = (value: string) => {
    const num = parseInt(value);
    if (value === "" || (!isNaN(num) && num >= 0)) {
      setHours(value === "" ? "0" : num.toString());
    }
  };

  const handleMinutesChange = (value: string) => {
    const num = parseInt(value);
    if (value === "" || (!isNaN(num) && num >= 0 && num < 60)) {
      setMinutes(value === "" ? "0" : num.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 opacity-40 animate-gradient" />

        {/* Success overlay animation */}
        {showSuccess && (
          <div className="absolute inset-0 bg-success/10 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-card rounded-full p-6 shadow-2xl animate-in zoom-in duration-300">
              <Sparkles className="h-12 w-12 text-success animate-pulse" />
            </div>
          </div>
        )}

        <div className="relative z-10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-md opacity-50 animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-secondary p-3 rounded-full">
                  <Clock className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Set Time Estimate
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Dual input section for hours and minutes */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Estimated Time
              </Label>
              
              <div className="flex gap-3 items-center">
                {/* Hours Input */}
                <div className="flex-1 relative group">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={hours}
                      onChange={(e) => handleHoursChange(e.target.value)}
                      placeholder="0"
                      className="text-3xl font-bold text-center h-20 border-2 transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-primary/50"
                      disabled={loading || showSuccess}
                    />
                    <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                      <span className="text-xs font-medium text-muted-foreground bg-card px-2 rounded-full">
                        hours
                      </span>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                <div className="text-3xl font-bold text-muted-foreground/50 pb-4">:</div>

                {/* Minutes Input */}
                <div className="flex-1 relative group">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => handleMinutesChange(e.target.value)}
                      placeholder="0"
                      className="text-3xl font-bold text-center h-20 border-2 transition-all duration-300 focus:border-primary focus:ring-4 focus:ring-primary/20 hover:border-primary/50"
                      disabled={loading || showSuccess}
                    />
                    <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                      <span className="text-xs font-medium text-muted-foreground bg-card px-2 rounded-full">
                        minutes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic feedback label */}
              {getTotalMinutes() > 0 && (
                <div className="text-center animate-in slide-in-from-top-2 duration-300">
                  <span className="text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                    {getEstimateLabel()}
                  </span>
                </div>
              )}
            </div>

            {/* Quick select buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quick Select:</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setQuickTime(0, 30)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "0" && minutes === "30"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  30m
                </button>
                <button
                  onClick={() => setQuickTime(1, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "1" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  1h
                </button>
                <button
                  onClick={() => setQuickTime(2, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "2" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  2h
                </button>
                <button
                  onClick={() => setQuickTime(4, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "4" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  4h
                </button>
                <button
                  onClick={() => setQuickTime(8, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "8" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  1 day
                </button>
                <button
                  onClick={() => setQuickTime(16, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "16" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  2 days
                </button>
                <button
                  onClick={() => setQuickTime(24, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "24" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  3 days
                </button>
                <button
                  onClick={() => setQuickTime(40, 0)}
                  disabled={loading || showSuccess}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                    hours === "40" && minutes === "0"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-transparent shadow-lg"
                      : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                  }`}
                >
                  1 week
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || showSuccess}
                className="flex-1 h-12 border-2 hover:bg-muted hover:border-muted-foreground/20 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || getTotalMinutes() === 0 || showSuccess}
                className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Save Estimate
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <style >{`
          @keyframes gradient {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(10px, 10px); }
            50% { transform: translate(0, 20px); }
            75% { transform: translate(-10px, 10px); }
          }
          .animate-gradient {
            animation: gradient 10s ease infinite;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
