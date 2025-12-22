import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";

export default function InvitationAcceptDialog() {
  const navigate = useNavigate();

  useEffect(() => {
    checkForPendingInvitation();
  }, []);

  const checkForPendingInvitation = async () => {
    try {
      const userId = authJwt.getUserId();
      if (!userId) return;

      const invitations = await api.organizations.myInvitations("pending");
      const first = invitations?.[0];
      if (!first?.id) return;

      // Redirect to invitation acceptance page
      navigate(`/accept-invitation?id=${first.id}`);
    } catch (error: any) {
      console.error("Error checking invitations:", error);
    }
  };

  return null;
}
