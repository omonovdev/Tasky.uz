import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import WinterBackground from "@/components/WinterBackground";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
}

interface GoalRow {
  id: string;
  goal_type: string;
  goal_text: string;
  deadline: string | null;
  created_at: string;
}

interface MemberStats {
  userId: string;
  name: string;
  completed: number;
  total: number;
}

const OrganizationStats = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      if (!organizationId) return;

      const taskData = await api.tasks.list({ organizationId, all: true });

      const normalizedTasks: TaskRow[] = (taskData || []).map((t: any) => {
        const name = t.assignedTo
          ? `${t.assignedTo.firstName ?? ""} ${t.assignedTo.lastName ?? ""}`.trim()
          : "";

        return {
          id: t.id,
          title: t.title,
          status: t.status,
          deadline: t.deadline ?? null,
          created_at: t.createdAt,
          completed_at: t.actualCompletedAt ?? null,
          assignee_id: t.assignedToId ?? null,
          assignee_name: name || null,
        };
      });

      setTasks(normalizedTasks);

      // Fetch goals created by this user for this organization (if such relation exists)
      const goalData = await api.goals.list();
      const normalizedGoals: GoalRow[] = (goalData || []).map((g: any) => ({
        id: g.id,
        goal_type: g.goalType,
        goal_text: g.goalText,
        deadline: g.deadline ?? null,
        created_at: g.createdAt,
      }));
      setGoals(normalizedGoals);

      // Build member statistics
      const statsMap = new Map<string, MemberStats>();
      normalizedTasks.forEach((task) => {
        if (!task.assignee_id) return;
        const key = task.assignee_id;
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            userId: key,
            name: task.assignee_name || t("common.unknownUser"),
            completed: 0,
            total: 0,
          });
        }
        const entry = statsMap.get(key)!;
        entry.total += 1;
        if (task.status === "completed") {
          entry.completed += 1;
        }
      });

      const statsArray = Array.from(statsMap.values()).sort(
        (a, b) => b.completed - a.completed
      );
      setMemberStats(statsArray);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const isSameDay = (d: Date) =>
    d.toDateString() === now.toDateString();
  const isSameWeek = (d: Date) => {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - d.getTime() < oneWeekMs;
  };
  const isSameMonth = (d: Date) =>
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const todayDone = completedTasks.filter((t) =>
    t.completed_at ? isSameDay(new Date(t.completed_at)) : false
  );
  const weekDone = completedTasks.filter((t) =>
    t.completed_at ? isSameWeek(new Date(t.completed_at)) : false
  );
  const monthDone = completedTasks.filter((t) =>
    t.completed_at ? isSameMonth(new Date(t.completed_at)) : false
  );

  const completionRate =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks.length / tasks.length) * 100);

  const topByCompleted = memberStats.slice(0, 3);
  const topByRate = [...memberStats]
    .filter((m) => m.total >= 3)
    .sort(
      (a, b) =>
        b.completed / b.total - a.completed / a.total
    )
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading organization stats...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative">
      <WinterBackground />
      <div className="container mx-auto p-6 space-y-6 relative z-10">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(now, "dd MMM yyyy")}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Today
            </CardTitle>
            <Badge variant="secondary">{todayDone.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayDone.length}</p>
            <p className="text-xs text-muted-foreground">
              Tasks completed today
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              This Week
            </CardTitle>
            <Badge variant="secondary">{weekDone.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{weekDone.length}</p>
            <p className="text-xs text-muted-foreground">
              Tasks completed in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              This Month
            </CardTitle>
            <Badge variant="secondary">{monthDone.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{monthDone.length}</p>
            <p className="text-xs text-muted-foreground">
              Tasks completed this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completion rate */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Award className="h-4 w-4 text-primary" />
            Overall Completion Rate
          </CardTitle>
          <span className="text-sm font-semibold">{completionRate}%</span>
        </CardHeader>
        <CardContent>
          <Progress value={completionRate} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {completedTasks.length} of {tasks.length} tasks completed
          </p>
        </CardContent>
      </Card>

      {/* Top performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Most Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByCompleted.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No completed tasks yet.
              </p>
            )}
            {topByCompleted.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.completed} completed
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{m.completed}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Highest Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topByRate.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Not enough data yet.
              </p>
            )}
            {topByRate.map((m) => {
              const rate =
                m.total === 0 ? 0 : Math.round((m.completed / m.total) * 100);
              return (
                <div
                  key={m.userId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.completed}/{m.total} completed
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white">
                    {rate}%
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Goals overview (simple for now) */}
      <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-primary" />
            Goals Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {goals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No goals defined yet.
            </p>
          )}
          {goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">{g.goal_text}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="outline">{g.goal_type}</Badge>
                  {g.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(g.deadline), "dd MMM yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default OrganizationStats;
