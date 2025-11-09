import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import { Users, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditOrganizationDialog from "@/components/EditOrganizationDialog";
import TasksList from "@/components/TasksList";
import MemberManagement from "@/components/MemberManagement";
import AgreementDialog from "@/components/AgreementDialog";
import SendInvitationDialog from "@/components/SendInvitationDialog";

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  description: string;
  motto: string;
  photo_url: string;
  created_by: string;
  agreement_text: string | null;
}


export default function OrganizationDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("pending");

  useEffect(() => {
    fetchOrganization();
    fetchUserRole();

    // Subscribe to realtime changes
    const membersChannel = supabase
      .channel('org-detail-members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${id}`
        },
        () => {
          fetchOrganization();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
    };
  }, [id]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      if (data) setUserRole(data.role);
    } catch (error: any) {
      console.error("Error fetching role:", error);
    }
  };

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load organization",
        variant: "destructive",
      });
      return;
    }

    setOrganization(data);

    const { data: { user } } = await supabase.auth.getUser();
    setIsCreator(data.created_by === user?.id);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ photo_url: publicUrl })
        .eq("id", id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Organization photo updated successfully",
      });
      
      fetchOrganization();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };


  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 max-h-screen overflow-y-auto">
      <div className="container mx-auto p-6 pb-24">
        <BackButton />
        
        <div className="mb-6 mt-6">
          <div className="flex gap-6 items-start">
            {/* Square Organization Photo on Left */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {organization.photo_url ? (
                  <img 
                    src={organization.photo_url} 
                    alt={organization.name} 
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary/30">
                      {organization.name[0]}
                    </span>
                  </div>
                )}
                {isCreator && userRole === "employer" && (
                  <label
                    htmlFor="org-photo-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-xs font-medium">Edit</span>
                    </div>
                    <input
                      id="org-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Organization Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{organization.name}</h1>
                  {organization.subheadline && (
                    <p className="text-lg text-muted-foreground mt-1">{organization.subheadline}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowMembersDialog(true)} variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Members
                  </Button>
                  {isCreator && userRole === "employer" && (
                    <>
                      <AgreementDialog 
                        organizationId={id!}
                        agreementText={organization.agreement_text}
                        isCreator={isCreator}
                        onAgreementUpdated={fetchOrganization}
                      />
                      <EditOrganizationDialog 
                        organization={organization} 
                        onUpdate={fetchOrganization}
                      />
                    </>
                  )}
                </div>
              </div>

              {organization.motto && (
                <p className="text-muted-foreground italic">"{organization.motto}"</p>
              )}
              
              {organization.description && (
                <p className="text-muted-foreground">{organization.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Section - Full Width */}
        <div className="w-full">
          <TasksList 
            organizationId={id!} 
            isCreator={isCreator && userRole === "employer"} 
            showOnlyMyTasks={false}
            filterStatus={taskFilter}
            onFilterChange={setTaskFilter}
          />
        </div>

        {/* Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Organization Members</DialogTitle>
            </DialogHeader>
            <MemberManagement 
              organizationId={id!} 
              creatorId={organization.created_by}
              isCreator={isCreator && userRole === "employer"}
            />
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}