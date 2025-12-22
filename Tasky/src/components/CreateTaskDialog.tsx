import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, CalendarIcon, Search, X, Users, Target, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Debounce hook
function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  assignment_count?: number;
  avatar_url?: string;
}

interface CreateTaskDialogProps {
  organizationId?: string;
  onTaskCreated?: () => void;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CreateTaskDialog({ 
  organizationId, 
  onTaskCreated,
  onClose,
  open,
  onOpenChange
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date>();
  const [deadlineTime, setDeadlineTime] = useState("09:00");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch members with caching
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId || organizationId === "undefined") {
        return [];
      }

      const [orgMembers, tasks] = await Promise.all([
        api.organizations.members(organizationId),
        api.tasks.list({ organizationId, all: true }),
      ]);

      const countMap: Record<string, number> = {};
      (tasks || []).forEach((task: any) => {
        if (task.status === "completed") return;
        (task.assignments || []).forEach((a: any) => {
          if (a.userId) countMap[a.userId] = (countMap[a.userId] || 0) + 1;
        });
      });

      const formattedMembers: Member[] = (orgMembers || []).map((m: any) => ({
        user_id: m.userId,
        first_name: m.user?.firstName || "Unknown",
        last_name: m.user?.lastName || "",
        avatar_url: m.user?.avatarUrl || undefined,
        assignment_count: countMap[m.userId] || 0,
      }));

      return formattedMembers.sort(
        (a, b) => (a.assignment_count || 0) - (b.assignment_count || 0),
      );
    },
    staleTime: 30000,
    enabled: !!organizationId && !!open,
  });

  // Fetch subgroups with caching
  const { data: subgroups = [] } = useQuery({
    queryKey: ['subgroups', organizationId],
    queryFn: async () => {
      if (!organizationId || organizationId === "undefined") return [];
      const data = await api.subgroups.list(organizationId);
      return (data || []).map((sg: any) => ({ id: sg.id, name: sg.name }));
    },
    staleTime: 60000,
    enabled: !!organizationId && !!open,
  });

  // Fetch user goals with caching
  const { data: userGoals = [] } = useQuery({
    queryKey: ['user-goals'],
    queryFn: async () => {
      const data = await api.goals.list();
      return (data || []).map((g: any) => ({ id: g.id, goal_text: g.goalText }));
    },
    staleTime: 60000,
    enabled: !!open,
  });

  // Filtered search results
  const filteredResults = debouncedSearch
    ? members.filter((m) => {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
        const lower = debouncedSearch.toLowerCase().trim();
        return fullName.includes(lower) || 
               m.first_name.toLowerCase().includes(lower) ||
               m.last_name.toLowerCase().includes(lower);
      })
    : [];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when search results available
  useEffect(() => {
    setShowDropdown(filteredResults.length > 0 && debouncedSearch.length > 0);
  }, [filteredResults.length, debouncedSearch]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGoal("");
    setSelectedMembers([]);
    setSelectedSubgroups([]);
    setDeadline(undefined);
    setDeadlineTime("09:00");
    setSearchQuery("");
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedMembers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    if (!deadline) {
      toast({
        title: "Validation Error",
        description: "Please select a deadline",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId || organizationId === "undefined") {
      toast({
        title: "Error",
        description: "Invalid organization ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const [hours, minutes] = deadlineTime.split(":");
      const finalDeadline = new Date(deadline);
      finalDeadline.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await api.tasks.create({
        organizationId,
        title: title.trim(),
        description: description.trim() || undefined,
        goal: goal && goal !== "custom" ? goal : undefined,
        assignedToId: selectedMembers[0],
        deadline: finalDeadline.toISOString(),
        assigneeIds: selectedMembers,
        subgroupIds: selectedSubgroups,
      });

      toast({ 
        title: "Task Created! 🎉", 
        description: `Assigned to ${selectedMembers.length} member(s)`,
      });

      if (onOpenChange) {
        onOpenChange(false);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onTaskCreated?.();

    } catch (error: any) {
      toast({ 
        title: "Failed to Create Task", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border-b flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Create New Task</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize work and collaborate with your team
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable content area */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Task Name */}
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Task Name *
              </Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Design homepage mockup"
                className="h-11 text-base border-2 focus:border-primary transition-colors"
                required 
              />
            </div>

            {/* Description */}
            <div className="space-y-2 animate-in fade-in slide-in-from-top-3 duration-300 delay-75">
              <Label htmlFor="description" className="text-base font-semibold flex items-center gap-2">
                <div className="w-1 h-5 bg-primary/60 rounded-full" />
                Description
              </Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Add details about the task..."
                rows={3}
                className="resize-none border-2 focus:border-primary transition-colors"
              />
            </div>

            {/* Goal */}
            {userGoals.length > 0 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300 delay-100">
                <Label htmlFor="goal" className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Link to Goal
                </Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="h-11 border-2">
                    <SelectValue placeholder="Select a goal (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {userGoals.map((userGoal) => (
                      <SelectItem key={userGoal.id} value={userGoal.goal_text}>
                        {userGoal.goal_text}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Goal</SelectItem>
                  </SelectContent>
                </Select>
                {goal === "custom" && (
                  <Textarea
                    className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200"
                    placeholder="Enter custom goal..."
                    onChange={(e) => setGoal(e.target.value === "" ? "custom" : e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Assign To */}
            <div className="space-y-3 animate-in fade-in slide-in-from-top-5 duration-300 delay-150">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Assign To *
              </Label>
              
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 border-2 focus:border-primary transition-colors"
                  disabled={loadingMembers}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowDropdown(false);
                    }}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Search Dropdown */}
                {showDropdown && filteredResults.length > 0 && (
                  <div className="absolute top-full mt-2 z-50 w-full bg-background border-2 border-primary/20 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredResults.map((member, index) => (
                      <div
                        key={member.user_id}
                        onClick={() => {
                          setSelectedMembers((prev) =>
                            prev.includes(member.user_id)
                              ? prev.filter((id) => id !== member.user_id)
                              : [...prev, member.user_id]
                          );
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-primary/5 flex items-center gap-3 transition-all duration-200 border-b last:border-0",
                          selectedMembers.includes(member.user_id) && "bg-primary/10",
                          "animate-in fade-in slide-in-from-top-1"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary/10">
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.assignment_count || 0} active tasks
                          </p>
                        </div>
                        {selectedMembers.includes(member.user_id) && (
                          <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in duration-200" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Members Pills */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border-2 border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  {selectedMembers.map((memberId) => {
                    const member = members.find(m => m.user_id === memberId);
                    if (!member) return null;
                    return (
                      <Badge 
                        key={memberId} 
                        variant="secondary" 
                        className="pl-1 pr-3 py-1.5 gap-2 hover:bg-secondary/80 transition-colors animate-in zoom-in duration-200"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {member.first_name} {member.last_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMembers(prev => prev.filter(id => id !== memberId))}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Quick Select Members */}
              {!loadingMembers && members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick Select</p>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-muted/30 rounded-lg border">
                    {members.slice(0, 4).map((member, index) => (
                      <label
                        key={member.user_id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-background transition-all duration-200 animate-in fade-in slide-in-from-left-2",
                          selectedMembers.includes(member.user_id) && "bg-primary/10 border border-primary/20"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Checkbox
                          checked={selectedMembers.includes(member.user_id)}
                          onCheckedChange={() => {
                            setSelectedMembers((prev) =>
                              prev.includes(member.user_id)
                                ? prev.filter((id) => id !== member.user_id)
                                : [...prev, member.user_id]
                            );
                          }}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.assignment_count || 0} tasks
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Subgroups */}
              {subgroups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Or Assign to Subgroups</p>
                  <div className="grid grid-cols-2 gap-2">
                    {subgroups.map((subgroup, index) => (
                      <label
                        key={subgroup.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-accent transition-all duration-200 animate-in fade-in zoom-in",
                          selectedSubgroups.includes(subgroup.id) && "bg-primary/10 border-primary/30"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Checkbox
                          checked={selectedSubgroups.includes(subgroup.id)}
                          onCheckedChange={() => {
                            setSelectedSubgroups((prev) =>
                              prev.includes(subgroup.id)
                                ? prev.filter((id) => id !== subgroup.id)
                                : [...prev, subgroup.id]
                            );
                          }}
                        />
                        <span className="text-sm font-medium truncate">{subgroup.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {loadingMembers && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading members...</p>
                </div>
              )}
            </div>

            {/* Deadline */}
            <div className="space-y-3 animate-in fade-in slide-in-from-top-6 duration-300 delay-200">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Deadline *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-11 justify-start text-left font-normal border-2 hover:border-primary transition-colors",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="h-11 border-2 focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer with Buttons */}
          <div className="flex-shrink-0 p-4 border-t bg-muted/30 flex gap-3 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (onOpenChange) {
                  onOpenChange(false);
                }
                resetForm();
              }}
              disabled={loading}
              className="min-w-24 hover:bg-accent transition-colors"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || loadingMembers}
              className="min-w-32 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
