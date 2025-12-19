import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: t("taskDeclineDialog.errorTitle"),
        description: t("taskDeclineDialog.errorDescRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.tasks.updateStatus(taskId, { status: "pending", declineReason: reason.trim() });

      toast({
        title: t("taskDeclineDialog.successTitle"),
        description: t("taskDeclineDialog.successDesc"),
      });

      setReason("");
      onOpenChange(false);
      onDeclineSubmitted();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("taskDeclineDialog.errorDescFail");
      toast({
        title: t("taskDeclineDialog.errorTitle"),
        description: message,
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
            {t("taskDeclineDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t("taskDeclineDialog.label")}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("taskDeclineDialog.placeholder")}
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
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="flex-1"
              variant="destructive"
            >
              {loading ? t("taskDeclineDialog.submitting") : t("taskDeclineDialog.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
