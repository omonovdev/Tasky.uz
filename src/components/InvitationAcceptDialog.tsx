import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function InvitationAcceptDialog() {
  const navigate = useNavigate();

  useEffect(() => {
    checkForPendingInvitation();
  }, []);

  const checkForPendingInvitation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invitations, error } = await supabase
        .from("organization_invitations")
        .select("id")
        .eq("employee_id", user.id)
        .eq("status", "pending")
        .single();

      if (error || !invitations) return;

      // Redirect to invitation acceptance page
      navigate(`/accept-invitation?id=${invitations.id}`);
    } catch (error: any) {
      console.error("Error checking invitations:", error);
    }
  };

  return null;
}