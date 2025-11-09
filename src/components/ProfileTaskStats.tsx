import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CheckCircle2, Clock, ListTodo, Timer } from "lucide-react";

interface ProfileTaskStatsProps {
  userId?: string;
}

export default function ProfileTaskStats({ userId }: ProfileTaskStatsProps) {
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalReceived: 0,
    totalInProgress: 0,
    totalHoursSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      const targetUserId = userId || currentUser.id;

      // Get tasks assigned to the target user
      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", targetUserId);

      const taskIds = assignments?.map(a => a.task_id) || [];

      const { data: myTasks } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds);

      if (!myTasks) return;

      const completed = myTasks.filter(t => t.status === "completed");
      const inProgress = myTasks.filter(t => t.status !== "completed");

      // Calculate total hours spent (from started_at to actual_completed_at for completed tasks)
      const totalHours = completed.reduce((sum, task) => {
        if (task.started_at && task.actual_completed_at) {
          const startTime = new Date(task.started_at).getTime();
          const endTime = new Date(task.actual_completed_at).getTime();
          const hours = (endTime - startTime) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      setStats({
        totalCompleted: completed.length,
        totalReceived: myTasks.length,
        totalInProgress: inProgress.length,
        totalHoursSpent: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "Completed", value: stats.totalCompleted, color: "#22C55E" },
    { name: "In Progress", value: stats.totalInProgress, color: "#FACC15" },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <ListTodo className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalReceived}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.totalCompleted}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.totalInProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Spent</CardTitle>
            <Timer className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalHoursSpent}h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.totalReceived > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tasks received yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}