import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, MoreVertical, Edit3, X, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import SubgroupManager from "./SubgroupManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const positionSchema = z.string().trim().min(1, "Position is required").max(100, "Position must be less than 100 characters");

const SUGGESTED_POSITIONS = [
  "CEO", "CTO", "CFO", "CMO", "COO",
  "Designer", "Engineer", "Developer", 
  "HR Manager", "Project Manager", "Team Lead",
  "Sales Manager", "Marketing Manager",
  "Product Manager", "Quality Assurance",
];

interface Member {
  id: string;
  user_id: string;
  position: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  invitation_id?: string;
  invitation_status?: string;
}

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
}

interface MemberManagementProps {
  organizationId: string;
  creatorId: string;
  isCreator: boolean;
}

export default function MemberManagement({ organizationId, creatorId, isCreator }: MemberManagementProps) {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [position, setPosition] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newPosition, setNewPosition] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    fetchUserRole();

    // Subscribe to realtime changes
    const membersChannel = supabase
      .channel('organization-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    const invitationsChannel = supabase
      .channel('organization-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_invitations',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(invitationsChannel);
    };
  }, [organizationId]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchMembers = async () => {
    // Fetch accepted members
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        position,
        profiles(first_name, last_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('added_at', { ascending: true });

    if (error) {
      console.error("Fetch members error:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
      return;
    }

    const formattedMembers = data
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        position: m.position || 'Employee',
        first_name: m.profiles.first_name,
        last_name: m.profiles.last_name,
        avatar_url: m.profiles.avatar_url,
      }));

    setMembers(formattedMembers);

    // Fetch pending invitations
    const { data: invitationsData } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        employee_id,
        contract_duration,
        status,
        profiles(first_name, last_name, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    if (invitationsData) {
      const formattedInvitations = invitationsData
        .filter((inv: any) => inv.profiles)
        .map((inv: any) => ({
          id: inv.id,
          user_id: inv.employee_id,
          position: inv.contract_duration || 'Employee',
          first_name: inv.profiles.first_name,
          last_name: inv.profiles.last_name,
          avatar_url: inv.profiles.avatar_url,
          invitation_id: inv.id,
          invitation_status: 'pending',
        }));

      setPendingInvitations(formattedInvitations);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Get current organization members (exclude only current members, not pending)
      const currentMemberIds = members.map(m => m.user_id);
      const pendingInvitationIds = pendingInvitations.map(inv => inv.user_id);
      const excludedIds = [...currentMemberIds, ...pendingInvitationIds];

      // Build query - search all profiles excluding only current members
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      // Only add exclusion filter if there are IDs to exclude
      if (excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      setSearchResults(profiles || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: error.message || "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  // Real-time search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, members, pendingInvitations]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowInviteForm(false);
    setSelectedUser(null);
    setPosition("");
    setCustomPosition("");
    setInvitationMessage("");
  };

  const handleSendInvitation = async (userId: string) => {
    if (!position.trim() && position !== "Other") {
      toast({
        title: "Error",
        description: "Please select a position",
        variant: "destructive",
      });
      return;
    }

    const finalPosition = position === "Other" ? customPosition : position;
    const validation = positionSchema.safeParse(finalPosition);
    
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if user already has any invitation (any status)
      const { data: existingInvitation } = await supabase
        .from('organization_invitations')
        .select('id, status')
        .eq('organization_id', organizationId)
        .eq('employee_id', userId)
        .maybeSingle();

      if (existingInvitation) {
        // If invitation exists, update it to pending with new details
        const { error: updateError } = await supabase
          .from('organization_invitations')
          .update({
            status: 'pending',
            invitation_message: invitationMessage,
            contract_duration: finalPosition,
            created_at: new Date().toISOString(),
            accepted_at: null,
          })
          .eq('id', existingInvitation.id);

        if (updateError) throw updateError;
      } else {
        // Create new invitation
        const { error: invError } = await supabase
          .from('organization_invitations')
          .insert({
            organization_id: organizationId,
            employee_id: userId,
            invitation_message: invitationMessage,
            contract_duration: finalPosition,
          });

        if (invError) throw invError;
      }

      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });

      clearSearch();
      fetchMembers();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePosition = async (memberId: string) => {
    if (!newPosition.trim()) {
      toast({
        title: "Error",
        description: "Position cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const validation = positionSchema.safeParse(newPosition);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ position: validation.data })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position updated successfully",
      });

      setEditingMember(null);
      setNewPosition("");
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    if (memberToRemove.user_id === creatorId) {
      toast({
        title: "Error",
        description: "Cannot remove the organization creator",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed successfully",
      });

      setMemberToRemove(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Tabs defaultValue="all" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="all">All Members</TabsTrigger>
        <TabsTrigger value="subgroups">Subgroups</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="space-y-4">
        {/* Invite Button and Search Section - Available to all members */}
        <Card className="p-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  variant={showInviteForm ? "default" : "outline"}
                  className="whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
                <Input
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" onClick={clearSearch}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => {
                    return (
                      <Card key={result.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={result.avatar_url || ""} />
                            <AvatarFallback>
                              {result.first_name[0]}{result.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{result.first_name} {result.last_name}</div>
                            <div className="text-sm text-muted-foreground">{result.email}</div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedUser(result);
                              setShowInviteForm(true);
                            }}
                          >
                            Invite
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No users found</p>
                  <p className="text-sm mt-1">Try searching with different name or email</p>
                </div>
              )}

              {/* Invite Form */}
              {showInviteForm && selectedUser && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Invite {selectedUser.first_name} {selectedUser.last_name}</h3>
                    <Button variant="ghost" size="sm" onClick={clearSearch}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                      {SUGGESTED_POSITIONS.map((pos) => (
                        <Button
                          key={pos}
                          type="button"
                          variant={position === pos ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPosition(pos)}
                        >
                          {pos}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={position === "Other" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPosition("Other")}
                      >
                        Other
                      </Button>
                    </div>
                  </div>

                  {position === "Other" && (
                    <div>
                      <Label htmlFor="custom-position">Custom Position</Label>
                      <Input
                        id="custom-position"
                        value={customPosition}
                        onChange={(e) => setCustomPosition(e.target.value)}
                        placeholder="Enter custom position"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="invitation-message">Invitation Message (Optional)</Label>
                    <Textarea
                      id="invitation-message"
                      value={invitationMessage}
                      onChange={(e) => setInvitationMessage(e.target.value)}
                      placeholder="Write a personalized message for the invitee..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={() => handleSendInvitation(selectedUser.id)}
                    disabled={loading || (!position.trim() && position !== "Other") || (position === "Other" && !customPosition.trim())}
                    className="w-full"
                  >
                    {loading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              )}
            </div>
          </Card>

        {/* Members List */}
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            All Members ({members.length + pendingInvitations.length})
          </h2>
          
          <div className="space-y-2">
            {/* Pending Invitations */}
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id} className="p-4 relative">
                <Badge className="absolute top-2 right-2" variant="outline">
                  Pending
                </Badge>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={invitation.avatar_url || ""} />
                    <AvatarFallback>
                      {invitation.first_name[0]}{invitation.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">
                      {invitation.first_name} {invitation.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invitation.position}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Accepted Members */}
            {members.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="cursor-pointer" onClick={() => navigate(`/organization/${organizationId}/member/${member.user_id}`)}>
                    <AvatarImage src={member.avatar_url || ""} />
                    <AvatarFallback>
                      {member.first_name[0]}{member.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">
                      {member.first_name} {member.last_name}
                      {member.user_id === creatorId && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Boss
                        </span>
                      )}
                    </div>
                    {editingMember?.id === member.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={newPosition}
                          onChange={(e) => setNewPosition(e.target.value)}
                          placeholder="Enter new position"
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdatePosition(member.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMember(null);
                            setNewPosition("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {member.position}
                      </div>
                    )}
                  </div>
                  {isCreator && member.user_id !== creatorId && userRole === "employer" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingMember(member);
                            setNewPosition(member.position);
                          }}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Update Position
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setMemberToRemove(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Fire
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="subgroups">
        <SubgroupManager organizationId={organizationId} isCreator={isCreator} />
      </TabsContent>
    </Tabs>

    {/* Remove Member Confirmation */}
    <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove {memberToRemove?.first_name} {memberToRemove?.last_name} from the organization.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove Member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
