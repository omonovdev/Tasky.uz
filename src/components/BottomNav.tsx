import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { 
  LayoutDashboard,
  Home, 
  Bell,
  Calendar,
  Trophy,
  Target,
  User 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext } from "@/components/NotificationContext";

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useNotificationContext();

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/dashboard" },
    { icon: Bell, label: t("nav.notifications"), path: "/notifications" },
    { icon: Calendar, label: t("nav.calendar"), path: "/calendar" },
    { icon: Trophy, label: t("nav.team"), path: "/team" },
    { icon: Target, label: t("nav.goals"), path: "/goals" },
    { icon: User, label: t("nav.account"), path: "/profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 z-50 shadow-xl">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showBadge = item.path === "/notifications" && unreadCount > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] min-h-[56px] rounded-lg transition-all duration-200 relative ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {showBadge && (
                  <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
