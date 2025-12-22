import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authState } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useTranslation } from "react-i18next";
import WinterBackground from "@/components/WinterBackground";

interface LeaderboardEntry {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  avatar_url: string | null;
  credits: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState.isLoggedIn()) navigate("/auth");
    fetchLeaderboard();
  }, []);

  const resolveOrganization = async () => {
    const stored = localStorage.getItem("selectedOrganizationId");
    if (stored) return stored;

    const memberships = await api.organizations.myMemberships();
    if (memberships && memberships[0]?.organizationId) {
      const orgId = memberships[0].organizationId;
      localStorage.setItem("selectedOrganizationId", orgId);
      return orgId;
    }

    return null;
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const selectedOrgId = await resolveOrganization();
      if (!selectedOrgId) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const [members, tasks] = await Promise.all([
        api.organizations.members(selectedOrgId),
        api.tasks.list({ organizationId: selectedOrgId, all: true }),
      ]);

      const completedCounts = new Map<string, number>();
      (tasks || [])
        .filter((t: any) => t.status === "completed")
        .forEach((t: any) => {
          const assignees = (t.assignments || []).map((a: any) => a.userId).filter(Boolean);
          const unique = new Set<string>(assignees.length ? assignees : [t.assignedToId]);
          unique.forEach((uid) => {
            completedCounts.set(uid, (completedCounts.get(uid) || 0) + 1);
          });
        });

      const leaderboardData: LeaderboardEntry[] = (members || []).map((m: any) => ({
        id: m.userId,
        first_name: m.user?.firstName || "",
        last_name: m.user?.lastName || "",
        position: m.position ?? null,
        avatar_url: m.user?.avatarUrl || null,
        credits: completedCounts.get(m.userId) || 0,
      }));

      // Sort by credits (completed tasks)
      const sorted = leaderboardData.sort((a, b) => b.credits - a.credits);
      setLeaderboard(sorted);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "1st";
    if (index === 1) return "2nd";
    if (index === 2) return "3rd";
    return `${index + 1}th`;
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("leaderboardPage.title")}</h1>
          <p className="text-muted-foreground">
            {t("leaderboardPage.subtitle")}
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 2nd Place */}
            <Card className="mt-8 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-gray-300/50 shadow-lg">
              <CardContent className="pt-6 text-center">
                <div className="mb-3 flex justify-center">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={leaderboard[1].avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(leaderboard[1].first_name, leaderboard[1].last_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Medal className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold">
                  {leaderboard[1].first_name} {leaderboard[1].last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leaderboard[1].position || t("leaderboardPage.staff")}
                </p>
                <Badge className="mt-2">{t("leaderboardPage.tasksLabel", { count: leaderboard[1].credits })}</Badge>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl ring-2 ring-yellow-500/60 shadow-2xl shadow-yellow-500/20">
              <CardContent className="pt-6 text-center">
                <div className="mb-3 flex justify-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={leaderboard[0].avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(leaderboard[0].first_name, leaderboard[0].last_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Trophy className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                <p className="font-bold text-lg">
                  {leaderboard[0].first_name} {leaderboard[0].last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leaderboard[0].position || t("leaderboardPage.staff")}
                </p>
                <Badge className="mt-2 bg-yellow-500">
                  {t("leaderboardPage.tasksLabel", { count: leaderboard[0].credits })}
                </Badge>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8 border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-amber-400/50 shadow-lg">
              <CardContent className="pt-6 text-center">
                <div className="mb-3 flex justify-center">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={leaderboard[2].avatar_url || ""} />
                    <AvatarFallback>
                      {getInitials(leaderboard[2].first_name, leaderboard[2].last_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Award className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                <p className="font-semibold">
                  {leaderboard[2].first_name} {leaderboard[2].last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leaderboard[2].position || t("leaderboardPage.staff")}
                </p>
                <Badge className="mt-2">{t("leaderboardPage.tasksLabel", { count: leaderboard[2].credits })}</Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card className="border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg">
          <CardHeader>
            <CardTitle>{t("leaderboardPage.fullRankings")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">{t("leaderboardPage.loading")}</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground">{t("leaderboardPage.noData")}</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 text-center font-bold text-muted-foreground">
                        {index < 3 ? getRankIcon(index) : getRankBadge(index)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar_url || ""} />
                        <AvatarFallback>
                          {getInitials(entry.first_name, entry.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {entry.first_name} {entry.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.position || t("leaderboardPage.staff")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{t("leaderboardPage.tasksLabel", { count: entry.credits })}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leaderboard;
