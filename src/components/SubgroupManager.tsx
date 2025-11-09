import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    const { data, error } = await supabase
      .from('subgroups')
      .select(`
        id,
        name,
        description
      `)
      .eq('organization_id', organizationId);

    if (error) {
      console.error(error);
      return;
    }

    // Fetch member counts
    const subgroupsWithCounts = await Promise.all(
      (data || []).map(async (sg) => {
        const { count } = await supabase
          .from('subgroup_members')
          .select('*', { count: 'exact', head: true })
          .eq('subgroup_id', sg.id);
        
        return { ...sg, member_count: count || 0 };
      })
    );

    setSubgroups(subgroupsWithCounts);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        profiles!organization_members_user_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
      return;
    }

    const formattedMembers = data.map((m: any) => ({
      user_id: m.user_id,
      first_name: m.profiles.first_name,
      last_name: m.profiles.last_name,
    }));

    setMembers(formattedMembers);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: subgroup, error: subgroupError } = await supabase
        .from('subgroups')
        .insert({
          organization_id: organizationId,
          name,
          description,
          created_by: user?.id,
        })
        .select()
        .single();

      if (subgroupError) throw subgroupError;

      // Add members
      if (selectedMembers.length > 0) {
        const members = selectedMembers.map(user_id => ({
          subgroup_id: subgroup.id,
          user_id,
        }));

        const { error: membersError } = await supabase
          .from('subgroup_members')
          .insert(members);

        if (membersError) throw membersError;
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
      const { error } = await supabase
        .from('subgroups')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
          <p className="text-sm text-muted-foreground text-center py-4">No subgroups yet</p>
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