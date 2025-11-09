import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshUnread: async () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔁 Fetch unread count
  const refreshUnread = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: readStatuses } = await supabase
        .from("notification_reads")
        .select("notification_type, notification_id")
        .eq("user_id", user.id);

      const readSet = new Set(
        readStatuses?.map(r => `${r.notification_type}-${r.notification_id}`) || []
      );

      let count = 0;

      // Count unread task assignments
      const { data: taskAssignments } = await supabase
        .from("task_assignments")
        .select("task_id")
        .eq("user_id", user.id);

      taskAssignments?.forEach((assignment) => {
        if (!readSet.has(`task-${assignment.task_id}`)) count++;
      });

      // Count unread invitations
      const { data: invitations } = await supabase
        .from("organization_invitations")
        .select("id")
        .eq("employee_id", user.id)
        .eq("status", "pending");

      invitations?.forEach((invitation) => {
        if (!readSet.has(`invitation-${invitation.id}`)) count++;
      });

      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing unread count:", error);
    }
  };

  // 🔄 Real-time listener
  useEffect(() => {
    refreshUnread();

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_assignments" },
        () => refreshUnread()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "organization_invitations" },
        () => refreshUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
