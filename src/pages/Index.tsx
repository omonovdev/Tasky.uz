import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authState } from "@/lib/auth";
import Home from "./Home";


const Index = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!authState.isLoggedIn()) {
      navigate("/auth");
      return;
    }

    // If user selected a role earlier (e.g., during onboarding), persist it.
    const pendingRole = sessionStorage.getItem("pending_role");
    if (pendingRole === "employee" || pendingRole === "employer") {
      sessionStorage.removeItem("pending_role");
      try {
        await api.users.setRole({ role: pendingRole });
      } catch {
        // Non-blocking
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <Home />;
};

export default Index;
