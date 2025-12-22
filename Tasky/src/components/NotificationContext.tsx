import { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { onNotification, offNotification } from "@/lib/socket";

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

  const refreshUnread = async () => {
    try {
      const userId = authJwt.getUserId();
      if (!userId) return;

      const readStatuses = await api.notifications.reads();

      const readSet = new Set(
        (readStatuses || []).map((r: any) => `${r.notificationType}-${r.notificationId}`)
      );

      let count = 0;

      // Count unread task assignments (foydalanuvchiga tayinlangan tasklar)
      const assignedTasks = await api.tasks.list({ all: false });

      assignedTasks?.forEach((task: any) => {
        if (!readSet.has(`task-${task.id}`)) count++;
      });

      // Count tasks you assigned that are completed (assigner uchun xabar)
      const completedTasks = await api.tasks.list({
        all: true,
        status: "completed",
        assignedById: userId,
      });

      completedTasks?.forEach((task: any) => {
        if (!readSet.has(`task_completed-${task.id}`)) count++;
      });

      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing unread count:", error);
    }
  };

  // 🔄 Real-time listener
  useEffect(() => {
    refreshUnread();

    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);

    // Real-time notification listener
    const handleNotification = (notification: any) => {
      // Brauzer notification (push) ham chiqarish mumkin
      if (window.Notification && Notification.permission === "granted") {
        new Notification("Yangi xabar", {
          body: notification.message || "Yangi notification keldi!",
        });
      }
      // Badge va UI yangilash
      refreshUnread();
    };
    onNotification(handleNotification);
    return () => {
      window.removeEventListener("focus", onFocus);
      offNotification(handleNotification);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
