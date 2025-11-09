import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Home from "./Home";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
    } else {
      // Handle Google OAuth callback - set role if pending
      const pendingRole = sessionStorage.getItem('pending_role');
      if (pendingRole && session.user) {
        sessionStorage.removeItem('pending_role');
        
        // Check if user_roles already exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!existingRole) {
          // Create role for OAuth user - user_id will be set from auth.uid()
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('user_roles').insert([{
              user_id: user.id,
              role: pendingRole as "employee" | "employer",
            }]);
          }
        }
      }
      
      setLoading(false);
    }
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
