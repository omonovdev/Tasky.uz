import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authState } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  Target, 
  Plus, 
  Trash2, 
  Pencil, 
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
  Flag,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatRelativeTime } from "@/lib/time";
import WinterBackground from "@/components/WinterBackground";

interface Goal {
  id: string;
  goal_type: string;
  goal_text: string;
  description: string | null;
  deadline: string | null;
  picture_url: string | null;
  created_at: string;
}

const Goals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
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
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editGoalText, setEditGoalText] = useState("");
  const [editGoalDescription, setEditGoalDescription] = useState("");
  const [editGoalDeadline, setEditGoalDeadline] = useState<Date>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addGoalType, setAddGoalType] = useState<"weekly" | "monthly" | "yearly">("weekly");

  useEffect(() => {
    if (!authState.isLoggedIn()) navigate("/auth");
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await api.goals.list();

      const mapped: Goal[] = (data || []).map((g: any) => ({
        id: g.id,
        goal_type: g.goalType,
        goal_text: g.goalText,
        description: g.description ?? null,
        deadline: g.deadline ?? null,
        picture_url: g.pictureUrl ?? null,
        created_at: g.createdAt,
      }));

      setWeeklyGoals(mapped.filter((g) => g.goal_type === "weekly"));
      setMonthlyGoals(mapped.filter((g) => g.goal_type === "monthly"));
      setYearlyGoals(mapped.filter((g) => g.goal_type === "yearly"));
    } catch (error: any) {
      toast({
        title: t("common.error"),
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
        title: t("common.error"),
        description: t("goalsPage.missingTitle"),
        variant: "destructive",
      });
      return;
    }

    try {
      await api.goals.create({
        goalType,
        goalText: text.trim(),
        description: description.trim() || undefined,
        deadline: deadline?.toISOString(),
      });

      toast({
        title: t("common.success"),
        description: t("goalsPage.addSuccess"),
      });

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
      
      setShowAddDialog(false);
      fetchGoals();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await api.goals.delete(goalId);

      toast({
        title: t("common.success"),
        description: t("goalsPage.deleteSuccess"),
      });

      fetchGoals();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateGoal = async () => {
    if (!editingGoal || !editGoalText.trim()) return;

    try {
      await api.goals.update(editingGoal.id, {
        goalText: editGoalText.trim(),
        description: editGoalDescription.trim() || undefined,
        deadline: editGoalDeadline?.toISOString(),
      });

      toast({
        title: t("common.success"),
        description: t("goalsPage.updateSuccess"),
      });

      setEditingGoal(null);
      setEditGoalText("");
      setEditGoalDescription("");
      setEditGoalDeadline(undefined);
      fetchGoals();
    } catch (error: any) {
      toast({
        title: t("common.error"),
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

  const openAddDialog = (type: "weekly" | "monthly" | "yearly") => {
    setAddGoalType(type);
    setShowAddDialog(true);
  };

  const getGoalTypeConfig = (type: string) => {
    switch (type) {
      case "weekly":
        return {
          color: "from-blue-500 to-cyan-600",
          bgColor: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
          icon: Zap,
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600 dark:text-blue-400",
          badgeColor: "bg-blue-500",
        };
      case "monthly":
        return {
          color: "from-purple-500 to-pink-600",
          bgColor: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
          borderColor: "border-purple-200 dark:border-purple-800",
          icon: TrendingUp,
          iconBg: "bg-purple-100 dark:bg-purple-900/30",
          iconColor: "text-purple-600 dark:text-purple-400",
          badgeColor: "bg-purple-500",
        };
      case "yearly":
        return {
          color: "from-amber-500 to-orange-600",
          bgColor: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
          borderColor: "border-amber-200 dark:border-amber-800",
          icon: Award,
          iconBg: "bg-amber-100 dark:bg-amber-900/30",
          iconColor: "text-amber-600 dark:text-amber-400",
          badgeColor: "bg-amber-500",
        };
      default:
        return {
          color: "from-blue-500 to-cyan-600",
          bgColor: "from-blue-50 to-cyan-50",
          borderColor: "border-blue-200",
          icon: Target,
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          badgeColor: "bg-blue-500",
        };
    }
  };

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const config = getGoalTypeConfig(goal.goal_type);
    const Icon = config.icon;
    const daysUntilDeadline = goal.deadline
      ? Math.ceil(
          (new Date(goal.deadline).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;
    const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;

    return (
      <div
        className={cn(
          "group relative p-6 rounded-2xl border-0 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 animate-slide-in",
          "bg-gradient-to-br backdrop-blur-sm ring-1 ring-white/30",
          config.bgColor
        )}
      >
        {/* Background Icon */}
        <div className="absolute top-4 right-4 opacity-10">
          <Icon className="h-20 w-20" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-3 rounded-xl", config.iconBg)}>
              <Icon className={cn("h-6 w-6", config.iconColor)} />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEditGoal(goal)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {goal.goal_text}
          </h3>

          {goal.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              {goal.description}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {deadlineDate && (
              <>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{format(deadlineDate, "dd MMM yyyy")}</span>
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysUntilDeadline !== null &&
                    (daysUntilDeadline > 0 ? (
                      <span>
                        {t("goalsPage.daysLeft", { count: daysUntilDeadline })}
                      </span>
                    ) : daysUntilDeadline === 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {t("goalsPage.dueToday")}
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        {t("goalsPage.overdue")}
                      </span>
                    ))}
                </Badge>
              </>
            )}

              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(new Date(goal.created_at), i18n.language)}
              </Badge>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = ({ type }: { type: string }) => {
    const config = getGoalTypeConfig(type);
    const Icon = config.icon;
    const heading =
      type === "weekly"
        ? t("goalsPage.noWeekly")
        : type === "monthly"
        ? t("goalsPage.noMonthly")
        : t("goalsPage.noYearly");
    const addLabel = t("goalsPage.addNewGoal", {
      type: t(
        type === "weekly"
          ? "goalsPage.weekly"
          : type === "monthly"
          ? "goalsPage.monthly"
          : "goalsPage.yearly"
      ),
    });

    return (
      <div className="text-center py-16">
        <div className={cn("w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center", config.iconBg)}>
          <Icon className={cn("h-10 w-10", config.iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {heading}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t("goalsPage.startGoals")}
        </p>
        <Button
          onClick={() => openAddDialog(type as any)}
          className={cn("bg-gradient-to-r shadow-lg", config.color)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {addLabel}
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen relative">
        <WinterBackground />
        <div className="text-center relative z-10">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <Target className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t("goalsPage.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container max-w-6xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex flex-col items-center gap-2 mb-4 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg mx-auto sm:mx-0">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                {t("goalsPage.title")}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
                {t("goalsPage.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {[
            { type: "weekly", count: weeklyGoals.length, icon: Zap, color: "from-blue-500 to-cyan-600" },
          { type: "monthly", count: monthlyGoals.length, icon: TrendingUp, color: "from-purple-500 to-pink-600" },
          { type: "yearly", count: yearlyGoals.length, icon: Award, color: "from-amber-500 to-orange-600" },
        ].map((stat, index) => {
          const label =
            stat.type === "weekly"
              ? t("goalsPage.weeklyGoals")
              : stat.type === "monthly"
              ? t("goalsPage.monthlyGoals")
              : t("goalsPage.yearlyGoals");
          const Icon = stat.icon;
          return (
            <Card key={stat.type} className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 capitalize">
                      {label}
                    </p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stat.count}
                      </p>
                    </div>
                    <div className={cn("p-3 rounded-xl bg-gradient-to-br", stat.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="weekly" className="w-full animate-fade-in" style={{ animationDelay: "200ms" }}>
          <TabsList className="grid w-full grid-cols-3 p-1.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md ring-1 ring-white/20 rounded-2xl h-auto text-sm sm:text-base">
            <TabsTrigger 
              value="weekly" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 py-3"
            >
              <Zap className="h-4 w-4 mr-2" />
              {t("goalsPage.weekly")}
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 py-3"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {t("goalsPage.monthly")}
            </TabsTrigger>
            <TabsTrigger 
              value="yearly"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 py-3"
            >
              <Award className="h-4 w-4 mr-2" />
              {t("goalsPage.yearly")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-6">
            <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
              <CardHeader className="border-b border-white/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {t("goalsPage.weeklyGoals")}
                  </CardTitle>
                  <Button 
                    onClick={() => openAddDialog("weekly")}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("goalsPage.addGoal")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {weeklyGoals.length === 0 ? (
                  <EmptyState type="weekly" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weeklyGoals.map((goal, index) => (
                      <div key={goal.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <GoalCard goal={goal} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
              <CardHeader className="border-b border-white/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    {t("goalsPage.monthlyGoals")}
                  </CardTitle>
                  <Button 
                    onClick={() => openAddDialog("monthly")}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("goalsPage.addGoal")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {monthlyGoals.length === 0 ? (
                  <EmptyState type="monthly" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {monthlyGoals.map((goal, index) => (
                      <div key={goal.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <GoalCard goal={goal} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="mt-6">
            <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
              <CardHeader className="border-b border-white/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    {t("goalsPage.yearlyGoals")}
                  </CardTitle>
                  <Button 
                    onClick={() => openAddDialog("yearly")}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("goalsPage.addGoal")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {yearlyGoals.length === 0 ? (
                  <EmptyState type="yearly" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {yearlyGoals.map((goal, index) => (
                      <div key={goal.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <GoalCard goal={goal} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              {t("goalsPage.addNewGoal", {
                type:
                  addGoalType === "weekly"
                    ? t("goalsPage.weekly")
                    : addGoalType === "monthly"
                    ? t("goalsPage.monthly")
                    : t("goalsPage.yearly"),
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="goalTitle">{t("goalsPage.goalTitle")} *</Label>
              <Input
                id="goalTitle"
                placeholder={t("goalsPage.titlePlaceholder")}
                value={
                  addGoalType === "weekly" ? weeklyGoalText :
                  addGoalType === "monthly" ? monthlyGoalText :
                  yearlyGoalText
                }
                onChange={(e) => {
                  if (addGoalType === "weekly") setWeeklyGoalText(e.target.value);
                  else if (addGoalType === "monthly") setMonthlyGoalText(e.target.value);
                  else setYearlyGoalText(e.target.value);
                }}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="goalDescription">{t("goalsPage.description")}</Label>
              <Textarea
                id="goalDescription"
                placeholder={t("goalsPage.descriptionPlaceholder")}
                value={
                  addGoalType === "weekly" ? weeklyGoalDescription :
                  addGoalType === "monthly" ? monthlyGoalDescription :
                  yearlyGoalDescription
                }
                onChange={(e) => {
                  if (addGoalType === "weekly") setWeeklyGoalDescription(e.target.value);
                  else if (addGoalType === "monthly") setMonthlyGoalDescription(e.target.value);
                  else setYearlyGoalDescription(e.target.value);
                }}
                rows={3}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="goalDeadline">{t("goalsPage.deadlineOptional")}</Label>
              <Input
                id="goalDeadline"
                type="date"
                value={
                  addGoalType === "weekly" && weeklyGoalDeadline ? weeklyGoalDeadline.toISOString().split('T')[0] :
                  addGoalType === "monthly" && monthlyGoalDeadline ? monthlyGoalDeadline.toISOString().split('T')[0] :
                  addGoalType === "yearly" && yearlyGoalDeadline ? yearlyGoalDeadline.toISOString().split('T')[0] :
                  ""
                }
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  if (addGoalType === "weekly") setWeeklyGoalDeadline(date);
                  else if (addGoalType === "monthly") setMonthlyGoalDeadline(date);
                  else setYearlyGoalDeadline(date);
                }}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                {t("goalsPage.cancel")}
              </Button>
              <Button 
                onClick={() => {
                  if (addGoalType === "weekly") addGoal("weekly", weeklyGoalText, weeklyGoalDescription, weeklyGoalDeadline);
                  else if (addGoalType === "monthly") addGoal("monthly", monthlyGoalText, monthlyGoalDescription, monthlyGoalDeadline);
                  else addGoal("yearly", yearlyGoalText, yearlyGoalDescription, yearlyGoalDeadline);
                }}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("goalsPage.addGoal")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t("goalsPage.editGoal")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editGoalTitle">{t("goalsPage.goalTitle")}</Label>
              <Input
                id="editGoalTitle"
                value={editGoalText}
                onChange={(e) => setEditGoalText(e.target.value)}
                placeholder={t("goalsPage.titlePlaceholder")}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="editGoalDescription">{t("goalsPage.description")}</Label>
              <Textarea
                id="editGoalDescription"
                value={editGoalDescription}
                onChange={(e) => setEditGoalDescription(e.target.value)}
                placeholder={t("goalsPage.descriptionPlaceholder")}
                rows={3}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="editGoalDeadline">{t("goalsPage.deadlineOptional")}</Label>
              <Input
                id="editGoalDeadline"
                type="date"
                value={editGoalDeadline ? editGoalDeadline.toISOString().split('T')[0] : ""}
                onChange={(e) => setEditGoalDeadline(e.target.value ? new Date(e.target.value) : undefined)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingGoal(null)} className="flex-1">
                {t("goalsPage.cancel")}
              </Button>
              <Button onClick={updateGoal} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t("goalsPage.saveChanges")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;
