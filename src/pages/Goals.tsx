import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Trash2, MoreVertical, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Goal {
  id: string;
  goal_type: string;
  goal_text: string;
  description: string | null;
  deadline: string | null;
  picture_url: string | null;
}

const Goals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<Goal[]>([]);
  const [yearlyGoals, setYearlyGoals] = useState<Goal[]>([]);
  const [weeklyGoalText, setWeeklyGoalText] = useState("");
  const [weeklyGoalDescription, setWeeklyGoalDescription] = useState("");
  const [weeklyGoalDeadline, setWeeklyGoalDeadline] = useState<Date>();
  const [monthlyGoalText, setMonthlyGoalText] = useState("");
  const [monthlyGoalDescription, setMonthlyGoalDescription] = useState("");
  const [monthlyGoalDeadline, setMonthlyGoalDeadline] = useState<Date>();
  const [yearlyGoalText, setYearlyGoalText] = useState("");
  const [yearlyGoalDescription, setYearlyGoalDescription] = useState("");
  const [yearlyGoalDeadline, setYearlyGoalDeadline] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editGoalText, setEditGoalText] = useState("");
  const [editGoalDescription, setEditGoalDescription] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState<Date>();

  useEffect(() => {
    checkAuth();
    fetchGoals();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setWeeklyGoals(data.filter((g) => g.goal_type === "weekly"));
      setMonthlyGoals(data.filter((g) => g.goal_type === "monthly"));
      setYearlyGoals(data.filter((g) => g.goal_type === "yearly"));
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

  const addGoal = async (goalType: string, text: string, description: string, deadline?: Date) => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: "Please enter a goal",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("user_goals").insert({
        user_id: user.id,
        goal_type: goalType,
        goal_text: text.trim(),
        description: description.trim() || null,
        deadline: deadline?.toISOString() || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal added successfully",
      });

      // Reset the appropriate fields based on goal type
      if (goalType === "weekly") {
        setWeeklyGoalText("");
        setWeeklyGoalDescription("");
        setWeeklyGoalDeadline(undefined);
      } else if (goalType === "monthly") {
        setMonthlyGoalText("");
        setMonthlyGoalDescription("");
        setMonthlyGoalDeadline(undefined);
      } else {
        setYearlyGoalText("");
        setYearlyGoalDescription("");
        setYearlyGoalDeadline(undefined);
      }
      
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("user_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal deleted successfully",
      });

      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateGoal = async () => {
    if (!editingGoal || !editGoalText.trim()) return;

    try {
      const { error } = await supabase
        .from("user_goals")
        .update({
          goal_text: editGoalText.trim(),
          description: editGoalDescription.trim() || null,
          deadline: editGoalDeadline?.toISOString() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingGoal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Goal updated successfully",
      });

      setEditingGoal(null);
      setEditGoalText("");
      setEditGoalDescription("");
      setEditGoalDeadline(undefined);
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditGoalText(goal.goal_text);
    setEditGoalDescription(goal.description || "");
    setEditGoalDeadline(goal.deadline ? new Date(goal.deadline) : undefined);
  };

  const GoalsList = ({ goals, goalType, text, setText, description, setDescription, deadline, setDeadline }: { 
    goals: Goal[]; 
    goalType: string;
    text: string;
    setText: (text: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    deadline?: Date;
    setDeadline: (date?: Date) => void;
  }) => (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Add New {goalType.charAt(0).toUpperCase() + goalType.slice(1)} Goal</Label>
        <Input
          placeholder="Goal title..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Input
          placeholder="Description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          type="date"
          value={deadline ? deadline.toISOString().split('T')[0] : ""}
          onChange={(e) => setDeadline(e.target.value ? new Date(e.target.value) : undefined)}
          placeholder="Deadline (optional)"
        />
        <Button onClick={() => addGoal(goalType, text, description, deadline)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No {goalType} goals set yet
          </p>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="p-4 border rounded-lg bg-card space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{goal.goal_text}</p>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  )}
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Deadline: {new Date(goal.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditGoal(goal)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteGoal(goal.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto p-6 pb-24">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Goals</h1>
            <p className="text-muted-foreground">Set and track your weekly, monthly, and yearly goals</p>
          </div>
        </div>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalsList 
                  goals={weeklyGoals} 
                  goalType="weekly"
                  text={weeklyGoalText}
                  setText={setWeeklyGoalText}
                  description={weeklyGoalDescription}
                  setDescription={setWeeklyGoalDescription}
                  deadline={weeklyGoalDeadline}
                  setDeadline={setWeeklyGoalDeadline}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalsList 
                  goals={monthlyGoals} 
                  goalType="monthly"
                  text={monthlyGoalText}
                  setText={setMonthlyGoalText}
                  description={monthlyGoalDescription}
                  setDescription={setMonthlyGoalDescription}
                  deadline={monthlyGoalDeadline}
                  setDeadline={setMonthlyGoalDeadline}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly">
            <Card>
              <CardHeader>
                <CardTitle>Yearly Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalsList 
                  goals={yearlyGoals} 
                  goalType="yearly"
                  text={yearlyGoalText}
                  setText={setYearlyGoalText}
                  description={yearlyGoalDescription}
                  setDescription={setYearlyGoalDescription}
                  deadline={yearlyGoalDeadline}
                  setDeadline={setYearlyGoalDeadline}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal Title</Label>
              <Input
                value={editGoalText}
                onChange={(e) => setEditGoalText(e.target.value)}
                placeholder="Goal title..."
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editGoalDescription}
                onChange={(e) => setEditGoalDescription(e.target.value)}
                placeholder="Description (optional)..."
                rows={3}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={editGoalDeadline ? editGoalDeadline.toISOString().split('T')[0] : ""}
                onChange={(e) => setEditGoalDeadline(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button onClick={updateGoal}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;
