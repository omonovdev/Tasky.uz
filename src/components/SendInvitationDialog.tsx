import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";

interface SendInvitationDialogProps {
  organizationId: string;
}

export default function SendInvitationDialog({ organizationId }: SendInvitationDialogProps) {
  const { t } = useTranslation();
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
          title: t("common.error"),
          description: t("members.userNotFound"),
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
        title: t("common.success"),
        description: t("members.invitationSent"),
      });

      setEmail("");
      setInvitationMessage("");
      setContractDuration("");
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("members.failedToInvite");
      toast({
        title: t("common.error"),
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
          {t("members.inviteMember")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("members.inviteToOrg")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("members.memberEmail")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("members.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invitation-message">{t("members.invitationMessage")}</Label>
            <Textarea
              id="invitation-message"
              placeholder={t("members.personalizedMessage")}
              value={invitationMessage}
              onChange={(e) => setInvitationMessage(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract-duration">{t("members.contractDuration")}</Label>
            <Input
              id="contract-duration"
              placeholder={t("members.contractPlaceholder")}
              value={contractDuration}
              onChange={(e) => setContractDuration(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSendInvitation}
            disabled={loading || !email || !contractDuration}
            className="w-full"
          >
            {loading ? t("members.sending") : t("members.sendInvitation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
