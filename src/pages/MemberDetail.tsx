import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BackButton from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ProfileTaskStats from "@/components/ProfileTaskStats";
import WinterBackground from "@/components/WinterBackground";

interface Member {
  id: string;
  user_id: string;
  position: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
}

export default function MemberDetail() {
  const { organizationId: urlOrgId, memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [position, setPosition] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showPositionDialog, setShowPositionDialog] = useState(false);

  const displayedTasks = showAllTasks ? tasks : tasks.slice(0, 3);

  // Task form
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState<Date>();

  useEffect(() => {
    const initialize = async () => {
      if (!memberId) {
        toast({
          title: "Error",
          description: "Member ID is required",
          variant: "destructive",
        });
        navigate("/team");
        return;
      }

      setLoading(true);
      
      try {
        // Determine organization ID from URL or localStorage
        let finalOrgId = urlOrgId || undefined;
        
        if (!finalOrgId) {
          finalOrgId = localStorage.getItem("selectedOrganizationId");
        }

        if (finalOrgId && finalOrgId.startsWith("11111111-")) {
          finalOrgId = undefined;
        }

        const memberships = await api.organizations.myMemberships();
        const isMemberOfSelected =
          !!finalOrgId && memberships.some((m: any) => m.organizationId === finalOrgId);

        if (!finalOrgId || !isMemberOfSelected) {
          finalOrgId = memberships?.[0]?.organizationId;
          if (finalOrgId) {
            localStorage.setItem("selectedOrganizationId", finalOrgId);
          }
        }

        if (!finalOrgId) {
          toast({
            title: "Error",
            description: "Could not determine organization",
            variant: "destructive",
          });
          navigate("/team");
          return;
        }

        setOrganizationId(finalOrgId);
        
        // Fetch all data in parallel
        await Promise.all([
          fetchMember(finalOrgId, memberId),
          fetchTasks(finalOrgId, memberId),
          checkCreator(finalOrgId)
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: "Error",
          description: "Failed to load member details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [urlOrgId, memberId]);

  const checkCreator = async (orgId: string) => {
    try {
      const currentUserId = authJwt.getUserId();
      if (!currentUserId) return;
      const org = await api.organizations.get(orgId);
      setIsCreator(org?.createdBy === currentUserId);
    } catch (error) {
      console.error('checkCreator error:', error);
    }
  };

  const fetchMember = async (orgId: string, userId: string) => {
    try {
      const members = await api.organizations.members(orgId);
      const row = (members || []).find((m: any) => m.userId === userId);

      if (!row) {
        toast({
          title: "Error",
          description: "Member not found in this organization",
          variant: "destructive",
        });
        navigate("/team");
        return;
      }

      const formattedMember: Member = {
        id: row.id,
        user_id: row.userId,
        position: row.position || 'Employee',
        first_name: row.user?.firstName || 'User',
        last_name: row.user?.lastName || '',
        avatar_url: row.user?.avatarUrl || '',
      };

      setMember(formattedMember);
      setPosition(formattedMember.position);
    } catch (error) {
      console.error('fetchMember error:', error);
      toast({
        title: "Error",
        description: "Failed to load member details",
        variant: "destructive",
      });
    }
  };

  const fetchTasks = async (orgId: string, userId: string) => {
    try {
      const allTasks = await api.tasks.list({ organizationId: orgId, all: true });

      const filtered = (allTasks || []).filter((t: any) => {
        if (t.assignedToId === userId) return true;
        return (t.assignments || []).some((a: any) => a.userId === userId);
      });

      filtered.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.updatedAt || 0).getTime() -
          new Date(a.createdAt || a.updatedAt || 0).getTime(),
      );

      const mapped: Task[] = filtered.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        deadline: t.deadline,
        status: t.status,
      }));

      setTasks(mapped);
    } catch (error) {
      console.error('fetchTasks error:', error);
    }
  };

  const handleAssignTask = async () => {
    if (!taskTitle || !taskDeadline) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId || !memberId) {
      toast({
        title: "Error",
        description: "Invalid organization or member ID",
        variant: "destructive",
      });
        return;
      }

    try {
      await api.tasks.create({
        organizationId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        assignedToId: memberId,
        deadline: taskDeadline.toISOString(),
        assigneeIds: [memberId],
      });
    } catch (error: any) {
      console.error('handleAssignTask error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign task",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Task assigned successfully",
    });

    setShowTaskDialog(false);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDeadline(undefined);
    if (organizationId) {
      fetchTasks(organizationId, memberId);
    }
  };

  const handleUpdatePosition = async () => {
    if (!member?.id) return;

    const finalPosition = position === "Other" ? customPosition : position;

    if (!finalPosition.trim()) {
      toast({
        title: "Error",
        description: "Position is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.organizations.updateMemberPosition(member.id, {
        position: finalPosition.trim(),
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update position",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Position updated successfully",
    });

    setShowPositionDialog(false);

    if (organizationId && memberId) {
      fetchMember(organizationId, memberId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">Member not found</p>
            <Button onClick={() => navigate("/team")}>Back to Team</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto bg-background p-6 pb-24">
      <BackButton />

      <div className="mt-6 space-y-6">
        {/* Member Info */}
        <Card className="p-6 relative">
          {isCreator && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setShowPositionDialog(true)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
          <div className="flex flex-col items-center gap-4 mb-2">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.first_name}
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-semibold text-primary">
                  {member.first_name[0]}
                  {member.last_name[0]}
                </span>
              </div>
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                {member.first_name} {member.last_name}
              </h1>
              <p className="text-muted-foreground mt-1">{member.position}</p>
            </div>
          </div>
        </Card>

        {/* Task Actions */}
        {isCreator && (
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Assign New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Task Name *</Label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Enter task name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Deadline *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskDeadline ? format(taskDeadline, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={taskDeadline}
                        onSelect={setTaskDeadline}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={handleAssignTask} className="w-full">
                  Assign Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Position edit dialog */}
        {isCreator && (
          <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Position</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="CEO">CEO</SelectItem>
                      <SelectItem value="CTO">CTO</SelectItem>
                      <SelectItem value="Developer">Developer</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Project Manager">Project Manager</SelectItem>
                      <SelectItem value="Team Lead">Team Lead</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {position === "Other" && (
                  <div>
                    <Label>Custom position</Label>
                    <Input
                      value={customPosition}
                      onChange={(e) => setCustomPosition(e.target.value)}
                      placeholder="Enter position"
                    />
                  </div>
                )}

                <Button onClick={handleUpdatePosition} className="w-full">
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Performance Stats */}
        <ProfileTaskStats userId={memberId} />

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Tasks</CardTitle>
              {tasks.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllTasks(!showAllTasks)}
                >
                  {showAllTasks ? 'Show Recent' : `All Tasks`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No tasks assigned yet
              </p>
            ) : (
              <div className="space-y-2">
                {displayedTasks.map(task => (
                  <Card key={task.id} className="p-3">
                    <h3 className="font-medium mb-1">{task.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'completed' ? 'bg-success/20 text-success' :
                        task.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-destructive">
                        Due: {format(new Date(task.deadline), "PP")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
