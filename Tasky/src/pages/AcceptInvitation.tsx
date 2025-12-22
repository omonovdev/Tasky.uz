import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Building2, User, Briefcase, FileText, Clock } from "lucide-react";

interface Invitation {
  id: string;
  organization_id: string;
  status: string;
  invitation_message: string | null;
  contract_duration: string | null;
}

interface Organization {
  id: string;
  name: string;
  agreement_text: string | null;
  agreement_version: number;
  photo_url: string | null;
}

interface Employer {
  first_name: string;
  last_name: string;
  position: string | null;
}

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("id");
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (invitationId) {
      checkInvitation();
    }
  }, [invitationId]);

  const checkInvitation = async () => {
    try {
      setFetching(true);

      const invitations = await api.organizations.myInvitations("pending");
      const invData = (invitations || []).find((inv: any) => inv.id === invitationId);

      if (!invData) {
        toast({
          title: "Invalid Invitation",
          description: "This invitation is no longer valid or has already been processed.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setInvitation({
        id: invData.id,
        organization_id: invData.organizationId,
        status: invData.status,
        invitation_message: invData.invitationMessage,
        contract_duration: invData.contractDuration,
      });

      const orgData = invData.organization;
      setOrganization({
        id: orgData.id,
        name: orgData.name,
        agreement_text: orgData.agreementText,
        agreement_version: orgData.agreementVersion || 0,
        photo_url: orgData.photoUrl || null,
      });

      const members = await api.organizations.members(orgData.id);
      const creatorMember = (members || []).find((m: any) => m.userId === orgData.createdBy);
      if (creatorMember?.user) {
        setEmployer({
          first_name: creatorMember.user.firstName,
          last_name: creatorMember.user.lastName,
          position: creatorMember.position || null,
        });
      }
    } catch (error: any) {
      console.error("Error checking invitation:", error);
      toast({
        title: "Error",
        description: "Failed to load invitation details",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setFetching(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation || !organization) return;

    try {
      setLoading(true);

      await api.organizations.acceptInvitation(invitation.id);

      // Set this as selected organization
      localStorage.setItem("selectedOrganizationId", organization.id);

      toast({
        title: "Success",
        description: `You've joined ${organization.name}!`,
      });

      // Navigate to organization page
      navigate(`/organization/${organization.id}`);
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

  const handleDecline = async () => {
    if (!invitation) return;

    try {
      setLoading(true);
      await api.organizations.declineInvitation(invitation.id);

      toast({
        title: "Invitation Declined",
        description: "You've declined the invitation",
      });

      navigate("/dashboard");
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

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation || !organization) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full">
        <CardHeader className="text-center space-y-4">
          {organization.photo_url ? (
            <div className="mx-auto w-24 h-24 rounded-lg overflow-hidden">
              <img 
                src={organization.photo_url} 
                alt={organization.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-12 h-12 text-primary/50" />
            </div>
          )}
          
          <div>
            <CardTitle className="text-3xl mb-2">Join {organization.name}</CardTitle>
            {employer && (
              <CardDescription className="text-lg">
                <User className="w-4 h-4 inline mr-2" />
                {employer.first_name} {employer.last_name}
                {employer.position && ` (${employer.position})`} is inviting you to join
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organization Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground">Organization</h4>
                <p className="text-base">{organization.name}</p>
              </div>
            </div>
            
            {employer && (
              <>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Invited by</h4>
                    <p className="text-base">{employer.first_name} {employer.last_name}</p>
                  </div>
                </div>
                
                {employer.position && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground">Position</h4>
                      <p className="text-base">{employer.position}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {invitation.invitation_message && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold">Message from Organization</h4>
              </div>
              <div className="rounded-md border p-4 bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{invitation.invitation_message}</p>
              </div>
            </div>
          )}

          {invitation.contract_duration && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-semibold">Contract Duration</h4>
              </div>
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm">{invitation.contract_duration}</p>
              </div>
            </div>
          )}

          {organization.agreement_text && (
            <>
              <div className="space-y-2">
                <h4 className="font-semibold">Organization Agreement</h4>
                <ScrollArea className="h-[250px] w-full rounded-md border p-4">
                  <p className="text-sm whitespace-pre-wrap">{organization.agreement_text}</p>
                </ScrollArea>
              </div>

              <div className="flex items-start space-x-2 p-4 bg-muted/30 rounded-lg">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label
                  htmlFor="agree"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I have read and accept the agreement
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleDecline}
              disabled={loading}
              className="flex-1"
            >
              Decline
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={loading || (organization.agreement_text && !agreed)}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {loading ? "Joining..." : "Accept & Join Organization"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
