import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Users, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateOrganizationForm } from "./CreateOrganizationForm";

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  photo_url: string;
  created_by: string;
}

export const OrganizationManager = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const orgs = await api.organizations.mine();
      const mapped: Organization[] = (orgs || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        subheadline: org.subheadline || "",
        photo_url: org.photoUrl || "",
        created_by: org.createdBy,
      }));
      setOrganizations(mapped);

      for (const org of mapped) {
        const members = await api.organizations.members(org.id);
        setMemberCounts((prev) => ({ ...prev, [org.id]: members?.length || 0 }));
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load organizations",
        variant: "destructive",
      });
    }
  };

  const handleOrganizationCreated = () => {
    setIsCreateDialogOpen(false);
    fetchOrganizations();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          My Organizations
        </h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background dark:bg-slate-950">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <CreateOrganizationForm 
              onSuccess={handleOrganizationCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You haven't created any organizations yet.
              <br />
              Click "New Organization" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {organizations.map((org) => (
            <Card 
              key={org.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/organization/${org.id}`)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  {org.photo_url ? (
                    <img 
                      src={org.photo_url} 
                      alt={org.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {org.name}
                    </CardTitle>
                    {org.subheadline && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {org.subheadline}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{memberCounts[org.id] || 0} members</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/organization/${org.id}`);
                    }}
                  >
                    Manage
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
