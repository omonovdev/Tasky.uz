import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bell, Calendar, Trophy, Target, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Calendar, label: "Calendar", path: "/calendar" },
  { icon: Trophy, label: "Team", path: "/team" },
  { icon: Target, label: "Goals", path: "/goals" },
  { icon: User, label: "Account", path: "/profile" },
];

const MobileDrawer = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      {/* Hamburger Icon */}
      <button
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-card shadow-lg md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        style={{ marginTop: 4 }}
      >
        <Menu className="w-7 h-7 text-primary" />
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <nav
            className="fixed top-0 left-0 h-full w-64 bg-card shadow-2xl flex flex-col pt-8 animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pb-4 border-b">
              <span className="text-xl font-bold text-primary">TaskFlow</span>
            </div>
            <div className="flex-1 flex flex-col gap-2 p-4">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { setOpen(false); navigate(item.path); }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{t(item.label) || item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
};

export default MobileDrawer;
