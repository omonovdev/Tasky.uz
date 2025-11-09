import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, X, File, Image as ImageIcon, Video } from "lucide-react";

interface TaskCompletionReportProps {
  taskId: string;
  onReportSubmitted: () => void;
}

const TaskCompletionReport = ({ taskId, onReportSubmitted }: TaskCompletionReportProps) => {
  const [reportText, setReportText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
        title: "Validation Error",
        description: "Please enter a report",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Update task status to completed first
      const { error: statusError } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", taskId);

      if (statusError) throw statusError;

      // Create report
      const { data: reportData, error: reportError } = await supabase
        .from("task_reports")
        .insert({
          task_id: taskId,
          user_id: user.id,
          report_text: reportText,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload files if any
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("task-attachments")
            .getPublicUrl(fileName);

          return {
            task_report_id: reportData.id,
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type,
          };
        });

        const attachments = await Promise.all(uploadPromises);

        const { error: attachmentError } = await supabase
          .from("task_attachments")
          .insert(attachments);

        if (attachmentError) throw attachmentError;
      }

      toast({
        title: "Success",
        description: "Report submitted successfully",
      });

      setReportText("");
      setFiles([]);
      onReportSubmitted();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
          Completion Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report">Report Details</Label>
            <Textarea
              id="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Describe what you've completed and any relevant details..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
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
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
              <span className="text-sm text-muted-foreground">
                {files.length} file(s) selected
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

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaskCompletionReport;
