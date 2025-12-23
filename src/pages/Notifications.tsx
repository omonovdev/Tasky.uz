import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt, authState } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  CheckCheck, 
  UserPlus, 
  ClipboardList, 
  Loader2,
  Building2,
  User,
  Clock,
  Briefcase,
  MessageSquare,
  Check,
  X,
  Sparkles
} from "lucide-react";
import TaskReportsDialog from "@/components/TaskReportsDialog";
import { useToast } from "@/hooks/use-toast";
import { useNotificationContext } from "@/components/NotificationContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "@/lib/time";
import WinterBackground from "@/components/WinterBackground";

interface Notification {
  id: string;
  type: "invitation" | "task" | "task_completed";
  message: string;
  read: boolean;
  status?: string; // invitation status
  created_at: string;
  task_id?: string;
  invitation_id?: string;
  organization_name?: string;
  invitation_message?: string;
  organization_id?: string;
  organization_photo?: string;
  invited_by_name?: string;
  invited_by_avatar?: string;
  position?: string;
  assignee_name?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const { setUnreadCount, refreshUnread } = useNotificationContext();

  useEffect(() => {
    checkAuth();
    fetchNotifications();

    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const checkAuth = () => {
    if (!authState.isLoggedIn()) navigate("/auth");
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userId = authJwt.getUserId();
      if (!userId) {
        navigate("/auth");
        return;
      }

      const notificationsList: Notification[] = [];

      // Fetch read statuses
      const readStatuses = await api.notifications.reads();
      const readSet = new Set(
        (readStatuses || []).map((r: any) => `${r.notificationType}-${r.notificationId}`),
      );

      const invitationsRaw = await api.organizations.myInvitations();

      (invitationsRaw || []).forEach((inv: any) => {
        const notifKey = `invitation-${inv.id}`;
        const isProcessed = inv.status !== "pending";
        const orgName = inv.organization?.name || "an organization";

        notificationsList.push({
          id: inv.id,
          type: "invitation",
          message: isProcessed
            ? `Invitation ${inv.status}: ${orgName}`
            : `You've been invited to join ${orgName}`,
          read: readSet.has(notifKey) || isProcessed,
          created_at: inv.createdAt || new Date().toISOString(),
          invitation_id: inv.id,
          organization_name: orgName,
          organization_photo: inv.organization?.photoUrl,
          invitation_message: inv.invitationMessage,
          organization_id: inv.organizationId,
          status: inv.status,
          invited_by_avatar: undefined,
          position: inv.contractDuration,
        });
      });

      const assignedTasks = await api.tasks.list({ all: false });

      (assignedTasks || [])
        .filter((task: any) => task.status !== "completed")
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt || b.updatedAt || 0).getTime() -
            new Date(a.createdAt || a.updatedAt || 0).getTime(),
        )
        .slice(0, 20)
        .forEach((task: any) => {
          const notifKey = `task-${task.id}`;
          const assignerName = task.assignedBy
            ? `${task.assignedBy.firstName || ""} ${task.assignedBy.lastName || ""}`.trim()
            : "Unknown";

          notificationsList.push({
            id: task.id,
            type: "task",
            message: t("notificationsPage.taskAssigned", { title: task.title || "Unknown" }),
            read: readSet.has(notifKey),
            created_at: task.createdAt || task.updatedAt || new Date().toISOString(),
            task_id: task.id,
            invited_by_name: assignerName,
          });
        });

      const completedTasks = await api.tasks.list({
        all: true,
        status: "completed",
        assignedById: userId,
      });

      (completedTasks || [])
        .sort(
          (a: any, b: any) =>
            new Date(b.actualCompletedAt || b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.actualCompletedAt || a.updatedAt || a.createdAt || 0).getTime(),
        )
        .slice(0, 30)
        .forEach((task: any) => {
          const notifKey = `task_completed-${task.id}`;
          const assigneeName = task.assignedTo
            ? `${task.assignedTo.firstName || ""} ${task.assignedTo.lastName || ""}`.trim()
            : undefined;

          notificationsList.push({
            id: `${task.id}-completed`,
            type: "task_completed",
            message: `Task completed: ${task.title || "Unknown task"}`,
            read: readSet.has(notifKey),
            created_at:
              task.actualCompletedAt ||
              task.updatedAt ||
              task.createdAt ||
              new Date().toISOString(),
            task_id: task.id,
            assignee_name: assigneeName,
          });
        });

      // Sort by date
      notificationsList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(notificationsList);

      // Badge endi tayinlangan tasklar va siz tayinlagan "completed" tasklar bo'yicha hisoblanadi
      const unreadTasksCount = notificationsList.filter(
        (n) => !n.read && (n.type === "task" || n.type === "task_completed")
      ).length;
      setUnreadCount(unreadTasksCount);
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

  const handleAcceptInvitation = async (invitationId: string, organizationId: string) => {
    setProcessingInvitation(invitationId);

    try {
      await api.organizations.acceptInvitation(invitationId);
      await api.notifications.markRead({
        notificationType: "invitation",
        notificationId: invitationId,
      });

      localStorage.setItem("selectedOrganizationId", organizationId);
      
      window.dispatchEvent(new CustomEvent("organization-joined", { 
        detail: { organizationId }
      }));

      toast({
        title: t("common.success"),
        description: t("notificationsPage.accepted"),
      });

      await fetchNotifications();
      await refreshUnread();

      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (error: any) {
      console.error("❌ ACCEPTANCE FAILED:", error);
        toast({
          title: t("common.error"),
          description: error.message || "",
          variant: "destructive",
        });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId);

    try {
      await api.organizations.declineInvitation(invitationId);
      await api.notifications.markRead({
        notificationType: "invitation",
        notificationId: invitationId,
      });

      toast({
        title: t("common.success"),
        description: t("notificationsPage.decline"),
      });

      await fetchNotifications();
      await refreshUnread();
    } catch (error: any) {
      console.error("❌ Error declining invitation:", error);
      toast({
        title: t("common.error"),
        description: error.message || "",
        variant: "destructive",
      });
    } finally {
      setProcessingInvitation(null);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    const targetId = notification.type === "invitation" ? notification.invitation_id : notification.task_id;
    if (!targetId) return;

    try {
      await api.notifications.markRead({
        notificationType: notification.type,
        notificationId: targetId,
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );

      if (notification.type === "task" || notification.type === "task_completed") {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    const unreadWithIds = unreadNotifications
      .map((n) => ({
        ...n,
        targetId: n.type === "invitation" ? n.invitation_id : n.task_id,
      }))
      .filter((n) => !!n.targetId);

    if (unreadWithIds.length === 0) {
      return;
    }

    // Optimistik UI: darhol o'qilgan deb belgilaymiz
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    setUnreadCount(0);

    try {
      await Promise.all(
        unreadWithIds.map((n) =>
          api.notifications
            .markRead({ notificationType: n.type, notificationId: n.targetId! })
            .catch(() => null),
        ),
      );

      await refreshUnread();
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast({
        title: t("common.error"),
        description: "Failed to mark as read",
        variant: "destructive",
      });
      // Agar xato bo'lsa, qayta yuklab UI ni sinxronlab qo'yamiz
      fetchNotifications();
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container max-w-5xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-in">
          <div className="w-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                {t("notificationsPage.title")}
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 ml-16">
              {t("notificationsPage.subtitle")}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md ring-1 ring-white/20 rounded-2xl w-fit animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-xl transition-all duration-200",
              filter === "all" && "shadow-lg"
            )}
          >
            {t("notificationsPage.all")}
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={cn(
              "rounded-xl transition-all duration-200",
              filter === "unread" && "shadow-lg"
            )}
          >
            {t("notificationsPage.unread")}
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </Button>
          {/* Mark All Read button, styled and positioned to the right of filter tabs */}
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            className="ml-auto px-4 py-2 rounded-xl border-primary text-primary font-semibold flex items-center gap-2 shadow-sm hover:bg-primary/10 transition-all duration-200"
            disabled={notifications.filter(n => !n.read).length === 0}
            style={{ minWidth: 0 }}
          >
            <CheckCheck className="h-4 w-4" />
            <span className="text-sm">{t("notificationsPage.markAllRead")}</span>
          </Button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <Card className="animate-fade-in border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{t("notificationsPage.loading")}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card className="animate-fade-in border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20" style={{ animationDelay: "200ms" }}>
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Bell className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {t("notificationsPage.allCaughtUp")}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {filter === "unread" ? t("notificationsPage.noUnread") : t("notificationsPage.none")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification, index) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-all duration-300 hover:shadow-2xl border-0 animate-slide-in backdrop-blur-xl ring-1",
                    !notification.read
                      ? "bg-white/90 dark:bg-slate-900/90 ring-primary/30 shadow-lg shadow-primary/10"
                      : "bg-white/80 dark:bg-slate-900/80 ring-white/20 hover:ring-white/30"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    {notification.type === "invitation" ? (
                      /* ENHANCED INVITATION CARD */
                      <div className="space-y-4">
                        {/* Header with Organization */}
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-4 border-white dark:border-slate-900 shadow-xl ring-2 ring-primary/20">
                              <AvatarImage src={notification.organization_photo || ""} />
                              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary to-primary/70 text-white">
                                {notification.organization_name?.substring(0, 2).toUpperCase() || "ORG"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                              <UserPlus className="h-3 w-3 text-white" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                  {t("notificationsPage.invitationTitle")}
                                </h3>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                  <Building2 className="h-4 w-4" />
                                  <span className="font-semibold text-primary">
                                    {notification.organization_name}
                                  </span>
                                </div>
                              </div>
                              {!notification.read && (
                                <Badge className="shrink-0 bg-gradient-to-r from-primary to-primary/80 shadow-lg">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {t("notificationsPage.newBadge")}
                                </Badge>
                              )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                              {/* Invited By */}
                              {/* <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Invited by</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                    {notification.invited_by_name}
                                  </p>
                                </div>
                              </div> */}

                              {/* Position */}
                              {notification.position && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ring-1 ring-white/30 dark:ring-slate-700/50">
                                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("notificationsPage.position")}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                      {notification.position}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Time */}
                              <div className={cn(
                                "flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm ring-1 ring-white/30 dark:ring-slate-700/50",
                                !notification.position && "sm:col-span-2"
                              )}>
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                  <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t("notificationsPage.time")}</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatRelativeTime(
                                      new Date(notification.created_at),
                                      i18n.language,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Invitation Message */}
                            {notification.invitation_message && (
                              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-sm ring-1 ring-amber-200/50 dark:ring-amber-800/30">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                                    <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-400 mb-1">
                                    {t("notificationsPage.personalMessage")}
                                  </p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                                      "{notification.invitation_message}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons or Status Display */}
                            <div className="flex gap-3 mt-4">
                              {notification.type === "invitation" && notification.status === "pending" ? (
                                <>
                                  <Button
                                    size="lg"
                                    onClick={() => handleAcceptInvitation(
                                      notification.invitation_id!,
                                      notification.organization_id!
                                    )}
                                    disabled={processingInvitation === notification.invitation_id}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                                  >
                                    {processingInvitation === notification.invitation_id ? (
                                      <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {t("notificationsPage.processing")}
                                      </>
                                    ) : (
                                      <>
                                        <Check className="mr-2 h-5 w-5" />
                                        {t("notificationsPage.accept")}
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => handleDeclineInvitation(notification.invitation_id!)}
                                    disabled={processingInvitation === notification.invitation_id}
                                    className="flex-1 border-2 hover:bg-red-50 dark:hover:bg-red-950 hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 transition-all duration-200"
                                  >
                                    <X className="mr-2 h-5 w-5" />
                                    {t("notificationsPage.decline")}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {notification.message?.includes("accepted") && (
                                    <Button
                                      size="lg"
                                      disabled
                                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                                    >
                                      <Check className="mr-2 h-5 w-5" />
                                      {t("notificationsPage.accepted")}
                                    </Button>
                                  )}
                                  {notification.message?.includes("declined") && (
                                    <Button
                                      size="lg"
                                      disabled
                                      variant="outline"
                                      className="flex-1 border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                                    >
                                      <X className="mr-2 h-5 w-5" />
                                      {t("notificationsPage.declined")}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* TASK NOTIFICATION CARD */
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                            {notification.type === "task_completed" ? (
                              <Check className="h-6 w-6 text-white" />
                            ) : (
                              <ClipboardList className="h-6 w-6 text-white" />
                            )}
                          </div>
                          {!notification.read && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className={cn(
                                "text-lg font-semibold text-slate-900 dark:text-white mb-1",
                                !notification.read && "font-bold"
                              )}>
                                {notification.type === "task_completed" ? "Task completed" : t("notificationsPage.newTask")}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {notification.message}
                                {notification.assignee_name && notification.type === "task_completed" && (
                                  <span className="ml-1 text-xs text-muted-foreground">(by {notification.assignee_name})</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(
                                  new Date(notification.created_at),
                                  i18n.language,
                                )}
                              </p>
                            </div>
                            {!notification.read && (
                              <Badge className="shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600">
                                {t("notificationsPage.newBadge")}
                              </Badge>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-200"
                            onClick={() => {
                              markAsRead(notification);
                              navigate("/tasks");
                            }}
                          >
                            {t("notificationsPage.viewTaskDetails")}
                          </Button>
                          {notification.type === "task_completed" && notification.task_id && (
                            <Button
                              size="sm"
                              className="mt-3 ml-2"
                              onClick={() => {
                                markAsRead(notification);
                                setReportTaskId(notification.task_id!);
                                setReportDialogOpen(true);
                              }}
                            >
                              View reports
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {reportTaskId && (
        <TaskReportsDialog
          taskId={reportTaskId}
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
        />
      )}
    </div>
  );
};

export default Notifications;
