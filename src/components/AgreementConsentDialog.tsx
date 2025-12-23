import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { authState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  agreement_text: string;
  agreement_version: number;
}

export default function AgreementConsentDialog() {
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkForUpdatedAgreement();
  }, []);

  const checkForUpdatedAgreement = async () => {
    try {
      // Check if user is logged in first
      if (!authState.isLoggedIn()) return;

      // Check if user is an employee
      const roleData = await api.users.getMyRole();
      if (roleData?.role !== "employee") return;

      // Get user's organization memberships
      const memberships = await api.organizations.myMemberships();
      if (!memberships?.length) return;

      const match = memberships.find((m: any) => {
        const org = m.organization;
        if (!org?.agreementText) return false;
        const orgVersion = org.agreementVersion || 0;
        const accepted = m.agreementVersionAccepted || 0;
        return orgVersion > accepted;
      });

      if (!match?.organization) return;

      const org = match.organization;
      setOrganization({
        id: org.id,
        name: org.name,
        agreement_text: org.agreementText,
        agreement_version: org.agreementVersion || 0,
      });
      setOpen(true);
    } catch (error) {
      console.error("Error checking for updated agreements:", error);
    }
  };

  const handleAccept = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      await api.organizations.acceptAgreement(organization.id, {
        agreementVersion: organization.agreement_version,
      });

      toast({
        title: "Success",
        description: "Agreement accepted successfully",
      });

      setOpen(false);
      // Check if there are more updated agreements
      setTimeout(checkForUpdatedAgreement, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to accept agreement";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Updated Agreement for {organization.name}</DialogTitle>
          <DialogDescription>
            The organization has updated its agreement. Please review and accept the new terms to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Updated Organization Agreement</h4>
            <ScrollArea className="h-[350px] w-full rounded-md border p-4">
              <p className="text-sm whitespace-pre-wrap">{organization.agreement_text}</p>
            </ScrollArea>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="agree-updated"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <label
              htmlFor="agree-updated"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the updated terms and conditions
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleAccept}
            disabled={loading || !agreed}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? "Accepting..." : "Accept Agreement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
