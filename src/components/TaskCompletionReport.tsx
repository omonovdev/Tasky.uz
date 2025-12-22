import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, X, File, Image as ImageIcon, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TaskCompletionReportProps {
  taskId: string;
  onReportSubmitted: () => void;
}

const TaskCompletionReport = ({ taskId, onReportSubmitted }: TaskCompletionReportProps) => {
  const [reportText, setReportText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportText.trim()) {
      toast({
        title: t("taskCompletionReport.validationTitle"),
        description: t("taskCompletionReport.validationDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await api.tasks.updateStatus(taskId, { status: "completed" });

      const attachments =
        files.length > 0
          ? await Promise.all(
              files.map(async (file) => {
                const uploaded = await api.uploads.upload(file, "task_attachments");
                return {
                  fileUrl: uploaded.url,
                  fileName: file.name,
                  fileType: file.type,
                  fileSize: file.size,
                };
              }),
            )
          : [];

      await api.tasks.addReport(taskId, {
        reportText: reportText.trim(),
        attachments: attachments.length ? attachments : undefined,
      });

      toast({
        title: t("taskCompletionReport.successTitle"),
        description: t("taskCompletionReport.successDesc"),
      });

      setReportText("");
      setFiles([]);
      onReportSubmitted();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("taskCompletionReport.errorDesc");
      toast({
        title: t("taskCompletionReport.errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {t("taskCompletionReport.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report">{t("taskCompletionReport.detailsLabel")}</Label>
            <Textarea
              id="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder={t("taskCompletionReport.placeholder")}
              rows={5}
              required
              className="border-success focus-visible:ring-success focus-visible:border-success"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">{t("taskCompletionReport.attachments")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachments"
                type="file"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("attachments")?.click()}
                className="border-success text-success hover:bg-success/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("taskCompletionReport.chooseFiles")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("taskCompletionReport.filesSelected", { count: files.length })}
              </span>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="text-sm truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-success text-success-foreground hover:bg-success/90"
          >
            {isSubmitting ? t("taskCompletionReport.submitting") : t("taskCompletionReport.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskCompletionReport;
