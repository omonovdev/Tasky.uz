import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Circle, Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface TaskStage {
  id: string;
  title: string;
  description: string | null;
  status: string;
  order_index: number;
}

interface TaskStagesManagerProps {
  taskId: string;
  isEmployeeView: boolean;
}

const TaskStagesManager = ({ taskId, isEmployeeView }: TaskStagesManagerProps) => {
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [newStageTitle, setNewStageTitle] = useState("");
  const [newStageDescription, setNewStageDescription] = useState("");
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchStages();
  }, [taskId]);

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from("task_stages")
        .select("*")
        .eq("task_id", taskId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addStage = async () => {
    if (!newStageTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Stage title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order_index)) : 0;

      const { error } = await supabase
        .from("task_stages")
        .insert({
          task_id: taskId,
          title: newStageTitle,
          description: newStageDescription,
          order_index: maxOrder + 1,
          status: "pending",
        });

      if (error) throw error;

      setNewStageTitle("");
      setNewStageDescription("");
      setShowAddStage(false);
      fetchStages();

      toast({
        title: "Success",
        description: "Stage added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStageStatus = async (stageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("task_stages")
        .update({ status: newStatus })
        .eq("id", stageId);

      if (error) throw error;

      setStages(stages.map(stage =>
        stage.id === stageId ? { ...stage, status: newStatus } : stage
      ));

      toast({
        title: "Success",
        description: "Stage status updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from("task_stages")
        .delete()
        .eq("id", stageId);

      if (error) throw error;

      fetchStages();

      toast({
        title: "Success",
        description: "Stage deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from("task_stages")
        .update({
          title: editTitle,
          description: editDescription,
        })
        .eq("id", stageId);

      if (error) throw error;

      setEditingStage(null);
      fetchStages();

      toast({
        title: "Success",
        description: "Stage updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    try {
      const stageIndex = stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return;
      
      const targetIndex = direction === 'up' ? stageIndex - 1 : stageIndex + 1;
      if (targetIndex < 0 || targetIndex >= stages.length) return;

      const stage = stages[stageIndex];
      const targetStage = stages[targetIndex];

      // Swap order_index
      const { error: error1 } = await supabase
        .from("task_stages")
        .update({ order_index: targetStage.order_index })
        .eq("id", stage.id);

      const { error: error2 } = await supabase
        .from("task_stages")
        .update({ order_index: stage.order_index })
        .eq("id", targetStage.id);

      if (error1 || error2) throw error1 || error2;

      fetchStages();

      toast({
        title: "Success",
        description: "Stage order updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const completedStages = stages.filter(s => s.status === "completed").length;
  const totalStages = stages.length;
  const completionPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in_progress":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Stages</CardTitle>
          {isEmployeeView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddStage(!showAddStage)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Stage
            </Button>
          )}
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">Stage {completedStages} of {totalStages}</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {completedStages > 0 && completedStages < totalStages && (
              <span>Current: {stages.find((s, i) => i === completedStages)?.title || "Next Stage"}</span>
            )}
            {completedStages === totalStages && totalStages > 0 && (
              <span className="text-success">All stages completed!</span>
            )}
            {completedStages === 0 && totalStages > 0 && (
              <span>Starting with: {stages[0]?.title}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAddStage && isEmployeeView && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-3">
              <Input
                placeholder="Stage title"
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
              />
              <Textarea
                placeholder="Stage description (optional)"
                value={newStageDescription}
                onChange={(e) => setNewStageDescription(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={addStage} size="sm">Add</Button>
                <Button onClick={() => setShowAddStage(false)} variant="outline" size="sm">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <div className="pt-0.5">
              {stage.status === "completed" ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              {editingStage === stage.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Stage title"
                  />
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Stage description"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => updateStage(stage.id)} size="sm">Save</Button>
                    <Button onClick={() => setEditingStage(null)} variant="outline" size="sm">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{index + 1}. {stage.title}</span>
                      <Badge variant="outline" className={getStatusColor(stage.status)}>
                        {stage.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {isEmployeeView && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStage(stage.id, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveStage(stage.id, 'down')}
                          disabled={index === stages.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingStage(stage.id);
                            setEditTitle(stage.title);
                            setEditDescription(stage.description || "");
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStage(stage.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {stage.description && (
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  )}
                  {isEmployeeView && stage.status !== "completed" && (
                    <div className="flex gap-2 pt-2">
                      {stage.status === "pending" && (
                        <Button
                          onClick={() => updateStageStatus(stage.id, "in_progress")}
                          size="sm"
                          variant="outline"
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        onClick={() => updateStageStatus(stage.id, "completed")}
                        size="sm"
                      >
                        Complete
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {stages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No stages yet</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskStagesManager;
