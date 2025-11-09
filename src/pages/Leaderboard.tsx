import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchLeaderboard();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get selected organization ID
      const selectedOrgId = localStorage.getItem("selectedOrganizationId");
      if (!selectedOrgId) {
        setLeaderboard([]);
        return;
      }

      // Get all members of the selected organization
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, profiles(id, first_name, last_name, position, avatar_url)")
        .eq("organization_id", selectedOrgId);

      if (!members) return;

      // For each member, count completed tasks
      const leaderboardData = await Promise.all(
        members
          .filter(m => m.profiles)
          .map(async (member: any) => {
            const profile = member.profiles;
            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("assigned_to", profile.id)
              .eq("status", "completed");

            return {
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              position: profile.position,
              avatar_url: profile.avatar_url,
              credits: count || 0,
            };
          })
      );

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
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            Top performers based on completed tasks
          </p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 2nd Place */}
            <Card className="mt-8">
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
                  {leaderboard[1].position || "Staff"}
                </p>
                <Badge className="mt-2">{leaderboard[1].credits} tasks</Badge>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="border-yellow-500/50 shadow-lg">
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
                  {leaderboard[0].position || "Staff"}
                </p>
                <Badge className="mt-2 bg-yellow-500">
                  {leaderboard[0].credits} tasks
                </Badge>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="mt-8">
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
                  {leaderboard[2].position || "Staff"}
                </p>
                <Badge className="mt-2">{leaderboard[2].credits} tasks</Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Full Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground">No data available</p>
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
                          {entry.position || "Staff"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{entry.credits} tasks</Badge>
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
