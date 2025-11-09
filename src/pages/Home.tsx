import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Bell, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrganizationManager } from "@/components/OrganizationManager";
import BottomNav from "@/components/BottomNav";
import InvitationAcceptDialog from "@/components/InvitationAcceptDialog";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
}

interface Profile {
  organization: string | null;
  position: string | null;
}

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  photo_url: string;
}

const Home = () => {
  const [profile, setProfile] = useState<Profile>({ organization: null, position: null });
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchUrgentTasks();
    fetchCreatedTasks();
    fetchOrganizations();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchUrgentTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .lte("deadline", threeDaysFromNow.toISOString())
        .order("deadline", { ascending: true })
        .limit(3);

      if (error) throw error;
      if (data) setUrgentTasks(data);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    }
  };

  const getDeadlineColor = (deadline: string) => {
    const daysUntil = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 1) return "bg-destructive text-destructive-foreground";
    if (daysUntil <= 3) return "bg-accent text-accent-foreground";
    return "bg-primary text-primary-foreground";
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const daysUntil = Math.ceil(
      (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil < 0) return "Overdue";
    return `${daysUntil} days`;
  };

  const fetchCreatedTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) setCreatedTasks(data);
    } catch (error: any) {
      console.error("Error fetching created tasks:", error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships, error } = await supabase
        .from("organization_members")
        .select("organization_id, organizations(*)")
        .eq("user_id", user.id);

      if (error) throw error;
      
      if (memberships) {
        const orgs = memberships
          .map(m => m.organizations)
          .filter(Boolean) as Organization[];
        setOrganizations(orgs);
      }
    } catch (error: any) {
      console.error("Error fetching organizations:", error);
    }
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 pb-20">
      <InvitationAcceptDialog />
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* My Organizations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              My Organizations
            </h2>
          </div>

          <OrganizationManager />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="h-14 text-base"
            onClick={() => navigate("/tasks")}
          >
            <Calendar className="w-5 h-5 mr-2" />
            My Tasks
          </Button>
          <Button
            variant="outline"
            className="h-14 text-base"
            onClick={() => navigate("/dashboard")}
          >
            <Bell className="w-5 h-5 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Tasks I Created */}
        {createdTasks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tasks I Created</h2>
            <div className="space-y-3">
              {createdTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate("/tasks")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <Badge className={task.status === "completed" ? "bg-success" : ""}>
                        {task.status}
                      </Badge>
                    </div>
                    {task.description && (
                      <CardDescription className="line-clamp-2">
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Urgent Tasks (Assigned to me) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              Urgent Tasks
            </h2>
            {urgentTasks.length > 0 && (
              <Badge variant="destructive">{urgentTasks.length}</Badge>
            )}
          </div>

          {urgentTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No urgent tasks at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate("/tasks")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <Badge className={getDeadlineColor(task.deadline)}>
                        {formatDeadline(task.deadline)}
                      </Badge>
                    </div>
                    {task.description && (
                      <CardDescription className="line-clamp-2">
                        {task.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
