import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, UserPlus, ClipboardList, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNotificationContext } from "@/components/NotificationContext";

interface Notification {
  id: string;
  type: "invitation" | "task";
  message: string;
  read: boolean;
  created_at: string;
  task_id?: string;
  invitation_id?: string;
  organization_name?: string;
  invitation_message?: string;
  organization_id?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  const { setUnreadCount, refreshUnread } = useNotificationContext();

  useEffect(() => {
    checkAuth();
    fetchNotifications();

    // Real-time subscriptions
    const invitationsChannel = supabase
      .channel("notifications-invitations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_invitations" },
        () => {
          console.log("🔔 Invitation change detected");
          fetchNotifications();
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel("notifications-tasks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_assignments" },
        () => {
          console.log("🔔 New task assignment detected");
          fetchNotifications();
        }
      )
      .subscribe();

    // Listen for membership changes to trigger dashboard refresh
    const membersChannel = supabase
      .channel("notifications-members")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "organization_members" },
        (payload) => {
          console.log("✅ New membership detected:", payload);
          // Trigger dashboard refresh via custom event
          window.dispatchEvent(new CustomEvent("organization-joined", { 
            detail: { organizationId: payload.new.organization_id }
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invitationsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const notificationsList: Notification[] = [];

      // Fetch read statuses
      const { data: readStatuses } = await supabase
        .from("notification_reads")
        .select("notification_type, notification_id")
        .eq("user_id", user.id);

      const readSet = new Set(
        readStatuses?.map(r => `${r.notification_type}-${r.notification_id}`) || []
      );

      // Fetch invitations (no nested orgs to avoid recursion)
      const { data: invitationsRaw, error: invError } = await supabase
        .from("organization_invitations")
        .select("id, created_at, invitation_message, status, organization_id")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });

      if (invError) {
        console.error("❌ Error fetching invitations:", invError);
      }

      // Fetch organization names separately
      const orgIds = invitationsRaw?.map((inv) => inv.organization_id) || [];
      let orgNamesMap: Record<string, string> = {};
      
      if (orgIds.length > 0) {
        const { data: orgs, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        
        if (!orgError && orgs) {
          orgNamesMap = orgs.reduce((acc, o) => {
            acc[o.id] = o.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Build invitation notifications
      if (invitationsRaw) {
        invitationsRaw.forEach((inv: any) => {
          const notifKey = `invitation-${inv.id}`;
          const isProcessed = inv.status !== "pending";
          
          notificationsList.push({
            id: inv.id,
            type: "invitation",
            message: isProcessed 
              ? `Invitation ${inv.status}: ${orgNamesMap[inv.organization_id] || "organization"}`
              : `Invitation to join ${orgNamesMap[inv.organization_id] || "organization"}`,
            read: readSet.has(notifKey) || isProcessed,
            created_at: inv.created_at,
            invitation_id: inv.id,
            organization_name: orgNamesMap[inv.organization_id],
            invitation_message: inv.invitation_message,
            organization_id: inv.organization_id,
          });
        });
      }

      // Fetch task assignments
      const { data: taskAssignments, error: taskError } = await supabase
        .from("task_assignments")
        .select("task_id, created_at, tasks(title, profiles!tasks_assigned_by_fkey(first_name, last_name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (taskError) {
        console.error("❌ Error fetching task assignments:", taskError);
      }

      if (taskAssignments) {
        taskAssignments.forEach((assignment: any) => {
          const notifKey = `task-${assignment.task_id}`;
          const assignerName = assignment.tasks?.profiles
            ? `${assignment.tasks.profiles.first_name || ""} ${assignment.tasks.profiles.last_name || ""}`.trim()
            : "Unknown";
          
          notificationsList.push({
            id: assignment.task_id,
            type: "task",
            message: `New task assigned: ${assignment.tasks?.title || "Unknown"} by ${assignerName}`,
            read: readSet.has(notifKey),
            created_at: assignment.created_at,
            task_id: assignment.task_id,
          });
        });
      }

      // Sort by date
      notificationsList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(notificationsList);

      // Update unread count
      const unreadCount = notificationsList.filter((n) => !n.read).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error("❌ Critical error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🚀 PRODUCTION-GRADE ACCEPTANCE FLOW
  const handleAcceptInvitation = async (invitationId: string, organizationId: string) => {
  setProcessingInvitation(invitationId);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    console.log("🔄 Step 1: Verifying invitation...");

    // Verify invitation exists and is pending
    const { data: invitation, error: invError } = await supabase
      .from("organization_invitations")
      .select("*")
      .eq("id", invitationId)
      .eq("employee_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (invError) throw new Error(`Invitation error: ${invError.message}`);
    if (!invitation) throw new Error("Invitation not found or already processed");

    console.log("✅ Invitation verified:", invitation);
    console.log("🔄 Step 2: Updating invitation status...");

    // Update invitation to 'accepted' FIRST
    const { error: updateError } = await supabase
      .from("organization_invitations")
      .update({ 
        status: "accepted", 
        accepted_at: new Date().toISOString() 
      })
      .eq("id", invitationId)
      .eq("status", "pending");

    if (updateError) throw new Error(`Update error: ${updateError.message}`);

    console.log("✅ Invitation marked as accepted");
    console.log("🔄 Step 3: Adding member to organization...");

    // Small delay to ensure DB consistency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Now insert into organization_members
    const memberData = {
      organization_id: invitation.organization_id,
      user_id: user.id,
      position: invitation.contract_duration || "Member",
      added_at: new Date().toISOString(),
      agreement_accepted_at: new Date().toISOString(),
      agreement_version_accepted: 1,
    };

    console.log("📝 Member data:", memberData);

    const { data: newMember, error: memberError } = await supabase
      .from("organization_members")
      .insert(memberData)
      .select()
      .maybeSingle();

    if (memberError) {
      console.error("❌ Member insert failed:", {
        code: memberError.code,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint,
      });

      // Rollback invitation
      await supabase
        .from("organization_invitations")
        .update({ status: "pending", accepted_at: null })
        .eq("id", invitationId);

      throw new Error(`Failed to add member: ${memberError.message}`);
    }

    console.log("✅ Member added successfully!", newMember);

    // Mark notification as read
    await supabase.from("notification_reads").insert({
      user_id: user.id,
      notification_type: "invitation",
      notification_id: invitationId,
    });

    // Store organization and trigger refresh
    localStorage.setItem("selectedOrganizationId", organizationId);
    
    window.dispatchEvent(new CustomEvent("organization-joined", { 
      detail: { organizationId }
    }));

    toast({
      title: "Success! 🎉",
      description: "You've joined the organization successfully.",
    });

    await fetchNotifications();
    await refreshUnread();

    setTimeout(() => navigate("/dashboard"), 1500);

  } catch (error: any) {
    console.error("❌ ACCEPTANCE FAILED:", error);
    
    toast({
      title: "Failed to accept invitation",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setProcessingInvitation(null);
  }
};
  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("organization_invitations")
        .update({ status: "declined", declined_at: new Date().toISOString() })
        .eq("id", invitationId)
        .eq("employee_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      // Mark as read
      await supabase.from("notification_reads").insert({
        user_id: user.id,
        notification_type: "invitation",
        notification_id: invitationId,
      });

      toast({
        title: "Invitation declined",
        description: "You can view it in your notification history.",
      });

      await fetchNotifications();
      await refreshUnread();
    } catch (error: any) {
      console.error("❌ Error declining invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation",
        variant: "destructive",
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("notification_reads").insert({
        user_id: user.id,
        notification_type: notification.type,
        notification_id: notification.type === "invitation" ? notification.invitation_id! : notification.task_id!,
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const unreadNotifications = notifications.filter((n) => !n.read);
      const inserts = unreadNotifications.map((n) => ({
        user_id: user.id,
        notification_type: n.type,
        notification_id: n.type === "invitation" ? n.invitation_id! : n.task_id!,
      }));

      if (inserts.length > 0) {
        await supabase.from("notification_reads").insert(inserts);
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await refreshUnread();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "invitation":
        return <UserPlus className="h-5 w-5" />;
      case "task":
        return <ClipboardList className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your latest activities
            </p>
          </div>
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No notifications to display</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-colors ${
                    !notification.read ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className={!notification.read ? "font-bold" : "font-medium"}>
                              {notification.message}
                            </p>
                            {notification.invitation_message && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{notification.invitation_message}"
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            
                            {notification.type === "invitation" && !notification.read && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptInvitation(
                                    notification.invitation_id!,
                                    notification.organization_id!
                                  )}
                                  disabled={processingInvitation === notification.invitation_id}
                                >
                                  {processingInvitation === notification.invitation_id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    "Accept"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeclineInvitation(notification.invitation_id!)}
                                  disabled={processingInvitation === notification.invitation_id}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                            
                            {notification.type === "task" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  markAsRead(notification);
                                  navigate("/tasks");
                                }}
                              >
                                View Task
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read ? (
                              <Badge variant="default" className="shrink-0">
                                New
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;