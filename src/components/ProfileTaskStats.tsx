import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CheckCircle2, Clock, ListTodo, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProfileTaskStatsProps {
  userId?: string;
}

export default function ProfileTaskStats({ userId }: ProfileTaskStatsProps) {
  const { t } = useTranslation();
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
      const me = await api.users.me();
      const targetUserId = userId || me.id;

      let tasks: any[] = [];
      if (targetUserId === me.id) {
        tasks = await api.tasks.list({ all: false });
      } else {
        const memberships = await api.organizations.myMemberships();
        const orgIds = Array.from(new Set((memberships || []).map((m: any) => m.organizationId)));
        const orgTasks = await Promise.all(orgIds.map((orgId) => api.tasks.list({ organizationId: orgId, all: true })));
        tasks = orgTasks.flat().filter((t: any) => (t.assignments || []).some((a: any) => a.userId === targetUserId));
      }

      const myTasks = tasks || [];

      const completed = myTasks.filter(t => t.status === "completed");
      const inProgress = myTasks.filter(t => t.status !== "completed");

      // Calculate total hours spent (from started_at to actual_completed_at for completed tasks)
      const totalHours = completed.reduce((sum, task) => {
        if (task.startedAt && task.actualCompletedAt) {
          const startTime = new Date(task.startedAt).getTime();
          const endTime = new Date(task.actualCompletedAt).getTime();
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
    { name: t("profileStats.completed"), value: stats.totalCompleted, color: "#22C55E" },
    { name: t("profileStats.inProgress"), value: stats.totalInProgress, color: "#FACC15" },
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
            <CardTitle className="text-sm font-medium">{t("profileStats.totalReceived")}</CardTitle>
            <ListTodo className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalReceived}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profileStats.completed")}</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.totalCompleted}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profileStats.inProgress")}</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.totalInProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profileStats.hoursSpent")}</CardTitle>
            <Timer className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.totalHoursSpent}h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profileStats.taskDistribution")}</CardTitle>
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
              {t("profileStats.noTasks")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
