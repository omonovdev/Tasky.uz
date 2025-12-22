import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Subgroup {
  id: string;
  name: string;
  description: string;
  member_count?: number;
}

interface SubgroupManagerProps {
  organizationId: string;
  isCreator: boolean;
}

export default function SubgroupManager({ organizationId, isCreator }: SubgroupManagerProps) {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubgroups();
    if (open) {
      fetchMembers();
    }
  }, [organizationId, open]);

  const fetchSubgroups = async () => {
    try {
      const data = await api.subgroups.list(organizationId);
      const mapped: Subgroup[] = (data || []).map((sg: any) => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        member_count: sg.members?.length || 0,
      }));
      setSubgroups(mapped);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await api.organizations.members(organizationId);
      const formattedMembers = (data || []).map((m: any) => ({
        user_id: m.userId,
        first_name: m.user?.firstName || "Unknown",
        last_name: m.user?.lastName || "User",
      }));
      setMembers(formattedMembers);
    } catch (error: any) {
      console.error("Fetch members error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load members",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const subgroup = await api.subgroups.create({
        organizationId,
        name,
        description,
      });

      if (selectedMembers.length > 0) {
        await api.subgroups.setMembers(subgroup.id, { userIds: selectedMembers });
      }

      toast({
        title: "Success",
        description: "Subgroup created successfully",
      });

      setOpen(false);
      setName("");
      setDescription("");
      setSelectedMembers([]);
      fetchSubgroups();
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

  const handleDelete = async (id: string) => {
    try {
      await api.subgroups.delete(id);

      toast({
        title: "Success",
        description: "Subgroup deleted successfully",
      });

      fetchSubgroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Subgroups</h3>
        {isCreator && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Subgroup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Subgroup</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Members</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sub-${member.user_id}`}
                          checked={selectedMembers.includes(member.user_id)}
                          onCheckedChange={() => {
                            setSelectedMembers(prev =>
                              prev.includes(member.user_id)
                                ? prev.filter(id => id !== member.user_id)
                                : [...prev, member.user_id]
                            );
                          }}
                        />
                        <label htmlFor={`sub-${member.user_id}`} className="text-sm cursor-pointer">
                          {member.first_name} {member.last_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {subgroups.length === 0 ? (
          <Card className="p-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">No subgroups yet</p>
            {isCreator && (
              <Button size="sm" onClick={() => setOpen(true)} className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create subgroup
              </Button>
            )}
          </Card>
        ) : (
          subgroups.map((subgroup) => (
            <Card key={subgroup.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{subgroup.name}</h4>
                  {subgroup.description && (
                    <p className="text-sm text-muted-foreground">{subgroup.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {subgroup.member_count} member{subgroup.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
                {isCreator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(subgroup.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
