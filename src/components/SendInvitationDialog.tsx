import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface SendInvitationDialogProps {
  organizationId: string;
}

export default function SendInvitationDialog({ organizationId }: SendInvitationDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [contractDuration, setContractDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendInvitation = async () => {
    try {
      setLoading(true);

      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (profileError || !profiles) {
        toast({
          title: "Error",
          description: "User not found with this email",
          variant: "destructive",
        });
        return;
      }

      // Check if user is an employee
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profiles.id)
        .single();

      if (roleError || roleData?.role !== "employee") {
        toast({
          title: "Error",
          description: "User must be an employee to receive invitations",
          variant: "destructive",
        });
        return;
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from("organization_invitations")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("employee_id", profiles.id)
        .maybeSingle();

      if (existingInvitation) {
        // Update existing invitation to pending with new details
        const { error: updateError } = await supabase
          .from("organization_invitations")
          .update({
            status: "pending",
            invitation_message: invitationMessage,
            contract_duration: contractDuration,
            created_at: new Date().toISOString(),
            accepted_at: null,
          })
          .eq("id", existingInvitation.id);

        if (updateError) throw updateError;
      } else {
        // Create new invitation
        const { error: invError } = await supabase
          .from("organization_invitations")
          .insert({
            organization_id: organizationId,
            employee_id: profiles.id,
            invitation_message: invitationMessage,
            contract_duration: contractDuration,
          });

        if (invError) throw invError;
      }

      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });

      setEmail("");
      setInvitationMessage("");
      setContractDuration("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Member to Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Member Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invitation-message">Invitation Message</Label>
            <Textarea
              id="invitation-message"
              placeholder="Write a personalized message for the invitee..."
              value={invitationMessage}
              onChange={(e) => setInvitationMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-duration">Contract Duration</Label>
            <Input
              id="contract-duration"
              placeholder="e.g., 1 year, 6 months, indefinite"
              value={contractDuration}
              onChange={(e) => setContractDuration(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSendInvitation} 
            disabled={loading || !email || !contractDuration}
            className="w-full"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}