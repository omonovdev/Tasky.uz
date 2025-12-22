import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
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

      const results = await api.users.search(email.trim());
      const profile = (results || []).find(
        (u: any) => (u.email || "").toLowerCase() === email.trim().toLowerCase(),
      );

      if (!profile?.id) {
        toast({
          title: "Error",
          description: "User not found with this email",
          variant: "destructive",
        });
        return;
      }

      await api.organizations.invite(organizationId, {
        employeeId: profile.id,
        invitationMessage,
        contractDuration,
      });

      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });

      setEmail("");
      setInvitationMessage("");
      setContractDuration("");
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      toast({
        title: "Error",
        description: message,
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
