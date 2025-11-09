import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileText, Download, Image, Video, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskReport {
  id: string;
  report_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface TaskAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
}

interface TaskReportsDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskReportsDialog({
  taskId,
  open,
  onOpenChange,
}: TaskReportsDialogProps) {
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [attachments, setAttachments] = useState<{ [key: string]: TaskAttachment[] }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open && taskId) {
      fetchReports();
    }
  }, [open, taskId]);

  const fetchReports = async () => {
    const { data: reportsData, error: reportsError } = await supabase
      .from("task_reports")
      .select(`
        id,
        report_text,
        created_at,
        user_id
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (reportsError) {
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
      return;
    }

    // Fetch user profiles separately
    const reportsWithProfiles = await Promise.all(
      (reportsData || []).map(async (report) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", report.user_id)
          .single();

        return {
          ...report,
          profiles: profile || { first_name: "Unknown", last_name: "User" },
        };
      })
    );

    setReports(reportsWithProfiles);

    // Fetch attachments for each report
    if (reportsData) {
      const attachmentsMap: { [key: string]: TaskAttachment[] } = {};
      
      await Promise.all(
        reportsData.map(async (report) => {
          const { data: attachmentsData } = await supabase
            .from("task_attachments")
            .select("*")
            .eq("task_report_id", report.id)
            .order("created_at", { ascending: false });

          if (attachmentsData) {
            attachmentsMap[report.id] = attachmentsData;
          }
        })
      );

      setAttachments(attachmentsMap);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Reports & Attachments</DialogTitle>
          <DialogDescription>
            View all completion reports and attached files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No reports submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {report.profiles.first_name} {report.profiles.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), "PPp")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{report.report_text}</p>
                  </div>

                  {attachments[report.id] && attachments[report.id].length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attachments:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {attachments[report.id].map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getFileIcon(attachment.file_type)}
                              <span className="text-sm truncate">
                                {attachment.file_name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                downloadFile(attachment.file_url, attachment.file_name)
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
