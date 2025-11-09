import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MoreVertical, Edit, Trash2, FileText, CheckCircle2, XCircle, Clock, TrendingUp, Calendar, User, Sparkles, ArrowRight, Flame, Award, Target } from "lucide-react";
import FireProgress from "./FireProgress";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import CreateTaskDialog from "./CreateTaskDialog";
import EditTaskDialog from "./EditTaskDialog";
import TaskReportsDialog from "./TaskReportsDialog";
import TaskDeclineDialog from "./TaskDeclineDialog";
import EstimatedTimeDialog from "./EstimatedTimeDialog";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  assigned_to: string;
  assigned_to_name?: string;
  assigned_by_name?: string;
  created_at: string;
  last_edited_by?: string;
  last_edited_at?: string;
  last_edited_by_name?: string;
  decline_reason?: string | null;
  estimated_completion_hours?: number | null;
}

interface GroupedTasks {
  [month: string]: Task[];
}

interface TasksListProps {
  organizationId: string;
  isCreator: boolean;
  showOnlyMyTasks?: boolean;
  filterStatus?: "all" | "pending" | "completed";
  onFilterChange?: (filter: "all" | "pending" | "completed") => void;
}

// Cache key factory for better organization
const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (orgId: string, userId?: string) => [...taskKeys.lists(), { orgId, userId }] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
};

export default function TasksList({ 
  organizationId, 
  isCreator, 
  showOnlyMyTasks = false, 
  filterStatus = "all", 
  onFilterChange 
}: TasksListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [viewingReports, setViewingReports] = useState<string | null>(null);
  const [decliningTask, setDecliningTask] = useState<string | null>(null);
  const [estimatingTask, setEstimatingTask] = useState<Task | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUser();
  }, []);

  // Fetch tasks with React Query caching
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          deadline,
          status,
          assigned_to,
          assigned_by,
          created_at,
          last_edited_by,
          last_edited_at,
          decline_reason,
          estimated_completion_hours
        `)
        .eq('organization_id', organizationId)
        .order('deadline', { ascending: true });

      let data;
      let error;

      if (showOnlyMyTasks) {
        const { data: myAssignments } = await supabase
          .from('task_assignments')
          .select('task_id')
          .eq('user_id', user.id);

        const myTaskIds = myAssignments?.map(a => a.task_id) || [];
        
        if (myTaskIds.length === 0) {
          return [];
        }

        const result = await query.in('id', myTaskIds);
        data = result.data;
        error = result.error;
      } else {
        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Batch fetch all profiles at once
      const allUserIds = new Set<string>();
      (data || []).forEach(task => {
        allUserIds.add(task.assigned_to);
        allUserIds.add(task.assigned_by);
        if (task.last_edited_by) allUserIds.add(task.last_edited_by);
      });

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(allUserIds));

      const profilesMap = new Map(
        allProfiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]) || []
      );

      // Batch fetch all task assignments
      const taskIds = (data || []).map(t => t.id);
      const { data: allAssignments } = await supabase
        .from('task_assignments')
        .select('task_id, user_id')
        .in('task_id', taskIds);

      const assignmentsMap = new Map<string, string[]>();
      allAssignments?.forEach(assignment => {
        if (!assignmentsMap.has(assignment.task_id)) {
          assignmentsMap.set(assignment.task_id, []);
        }
        assignmentsMap.get(assignment.task_id)?.push(assignment.user_id);
      });

      // Map tasks with names
      const tasksWithNames = (data || []).map((task) => {
        const assigneeIds = assignmentsMap.get(task.id) || [task.assigned_to];
        const names = assigneeIds
          .map(id => profilesMap.get(id))
          .filter(Boolean)
          .join(', ') || 'Unknown';

        return {
          ...task,
          assigned_to_name: names,
          assigned_by_name: profilesMap.get(task.assigned_by) || 'Unknown',
          last_edited_by_name: task.last_edited_by 
            ? profilesMap.get(task.last_edited_by) 
            : undefined,
        };
      });

      return tasksWithNames;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled: !!currentUserId,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`tasks-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            queryClient.setQueryData<Task[]>(
              taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
              (old = []) => {
                return old.map(task => 
                  task.id === payload.new.id 
                    ? { ...task, ...payload.new as any }
                    : task
                );
              }
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            queryClient.setQueryData<Task[]>(
              taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
              (old = []) => old.filter(task => task.id !== payload.old.id)
            );
          } else {
            queryClient.invalidateQueries({
              queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient, showOnlyMyTasks, currentUserId]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
      });

      const previousTasks = queryClient.getQueryData<Task[]>(
        taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
      );

      queryClient.setQueryData<Task[]>(
        taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
        (old = []) => old.filter(task => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (error, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined),
          context.previousTasks
        );
      }
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      setDeletingTask(null);
    },
  });

  const handleDeleteTask = (taskId: string) => {
    deleteMutation.mutate(taskId);
  };

  // Memoized grouped tasks
  const groupedTasks: GroupedTasks = tasks.reduce((acc, task) => {
    const monthYear = format(new Date(task.deadline), 'MMMM yyyy');
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(task);
    return acc;
  }, {} as GroupedTasks);

  const formatTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (totalMinutes < 0) {
      const overdueDays = Math.floor(Math.abs(totalMinutes) / (60 * 24));
      const overdueHours = Math.floor(Math.abs(totalMinutes) / 60);
      if (overdueDays > 0) return `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
      return `Overdue by ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`;
    }
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''} left`;
    }
    
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
      return `${totalHours} hour${totalHours !== 1 ? 's' : ''} left`;
    }
    
    const totalDays = Math.floor(totalHours / 24);
    return `${totalDays} day${totalDays !== 1 ? 's' : ''} left`;
  };

  const getCompletionPercentage = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      default:
        return 0;
    }
  };

  const getUrgencyLevel = (deadline: string, status: string) => {
    if (status === 'completed') return 'completed';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'overdue';
    if (hoursLeft < 24) return 'critical';
    if (hoursLeft < 72) return 'urgent';
    return 'normal';
  };

  const effectiveFilter = onFilterChange ? filterStatus : filterMode;
  
  const filteredTasks = effectiveFilter === 'all' 
    ? tasks 
    : effectiveFilter === 'completed' 
      ? tasks.filter(t => t.status === 'completed')
      : tasks.filter(t => t.status === 'in_progress' || t.status === 'pending');

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length;

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.list(organizationId, showOnlyMyTasks ? currentUserId || undefined : undefined)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/30 border-t-primary"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-7 w-7 text-primary animate-pulse" />
            Your Tasks
          </h2>
          <p className="text-muted-foreground mt-1">Track and manage your work efficiently</p>
        </div>
        {isCreator && (
          <CreateTaskDialog organizationId={organizationId} onTaskCreated={handleTaskUpdated} />
        )}
      </div>

      {/* Stats Cards - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-5 duration-500">
        <Card 
          className={cn(
            "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border-2",
            "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
            (onFilterChange ? filterStatus === "pending" : filterMode === 'in_progress') 
              ? 'border-primary/40 shadow-2xl shadow-primary/20 ring-2 ring-primary' 
              : 'border-primary/20 hover:border-primary/30 hover:shadow-xl'
          )}
          onClick={() => {
            if (onFilterChange) {
              onFilterChange(filterStatus === "pending" ? "all" : "pending");
            } else {
              setFilterMode(filterMode === 'in_progress' ? 'all' : 'in_progress');
            }
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-10">
            <Flame className="h-32 w-32 text-primary" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-4xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform">
              {inProgressCount}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">To Be Completed</p>
            <Progress value={(inProgressCount / (tasks.length || 1)) * 100} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border-2",
            "bg-gradient-to-br from-success/10 via-success/5 to-transparent",
            (onFilterChange ? filterStatus === "completed" : filterMode === 'completed') 
              ? 'border-success/40 shadow-2xl shadow-success/20 ring-2 ring-success' 
              : 'border-success/20 hover:border-success/30 hover:shadow-xl'
          )}
          onClick={() => {
            if (onFilterChange) {
              onFilterChange(filterStatus === "completed" ? "all" : "completed");
            } else {
              setFilterMode(filterMode === 'completed' ? 'all' : 'completed');
            }
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-10">
            <Award className="h-32 w-32 text-success" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/10 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <ArrowRight className="h-5 w-5 text-success opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-4xl font-bold text-success mb-2 group-hover:scale-110 transition-transform">
              {completedCount}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Completed Tasks</p>
            <Progress value={(completedCount / (tasks.length || 1)) * 100} className="h-1.5 mt-3 [&>div]:bg-success" />
          </CardContent>
        </Card>
      </div>

      {/* Tasks Display */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {filteredTasks.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <Target className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground">
              {effectiveFilter === 'completed' 
                ? 'No completed tasks yet. Keep working!' 
                : effectiveFilter === 'in_progress' || effectiveFilter === 'pending'
                ? 'No tasks in progress. Great job staying on top of things!'
                : 'Create your first task to get started'}
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* In Progress Tasks */}
            {filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-lg py-3 z-20 border-b-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                    Active Tasks
                  </h3>
                  <Badge variant="secondary" className="ml-auto">
                    {filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'pending').length} tasks
                  </Badge>
                </div>

                {Object.entries(groupedTasks).map(([month, monthTasks]) => {
                  const inProgressTasks = monthTasks.filter(t => 
                    (t.status === 'in_progress' || t.status === 'pending') && filteredTasks.includes(t)
                  );
                  if (inProgressTasks.length === 0) return null;
                  
                  return (
                    <div key={month} className="space-y-3">
                      <div className="flex items-center gap-2 px-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h4 className="text-lg font-semibold text-primary">{month}</h4>
                      </div>

                      <div className="grid gap-3">
                        {inProgressTasks.map((task, index) => {
                          const urgency = getUrgencyLevel(task.deadline, task.status);
                          const completionPercentage = getCompletionPercentage(task.status);
                          
                          return (
                            <Card
                              key={task.id}
                              className={cn(
                                "group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-2 cursor-pointer",
                                "animate-in fade-in slide-in-from-left-4",
                                urgency === 'overdue' && "border-destructive/30 bg-destructive/5",
                                urgency === 'critical' && "border-destructive/20 bg-destructive/3",
                                urgency === 'urgent' && "border-amber-500/20 bg-amber-500/3",
                                urgency === 'normal' && "border-border hover:border-primary/30",
                                hoveredTask === task.id && "scale-[1.02] shadow-xl"
                              )}
                              style={{ animationDelay: `${index * 75}ms` }}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => setHoveredTask(null)}
                              onClick={() => window.location.href = `/task/${task.id}`}
                            >
                              {/* Animated Background Gradient */}
                              <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                                urgency === 'overdue' && "bg-gradient-to-br from-destructive/10 to-transparent",
                                urgency === 'critical' && "bg-gradient-to-br from-destructive/5 to-transparent",
                                urgency === 'urgent' && "bg-gradient-to-br from-amber-500/5 to-transparent",
                                urgency === 'normal' && "bg-gradient-to-br from-primary/5 to-transparent"
                              )} />

                              <div className="relative p-6 space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start gap-3">
                                      <div className={cn(
                                        "p-2 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform",
                                        urgency === 'overdue' && "bg-destructive/10",
                                        urgency === 'critical' && "bg-destructive/10",
                                        urgency === 'urgent' && "bg-amber-500/10",
                                        urgency === 'normal' && "bg-primary/10"
                                      )}>
                                        {urgency === 'overdue' || urgency === 'critical' ? (
                                          <Flame className={cn("h-5 w-5", urgency === 'overdue' ? "text-destructive animate-pulse" : "text-destructive")} />
                                        ) : urgency === 'urgent' ? (
                                          <Clock className="h-5 w-5 text-amber-500" />
                                        ) : (
                                          <Target className="h-5 w-5 text-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                        <User className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{task.assigned_to_name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                                      </div>
                                      {task.estimated_completion_hours && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span>{task.estimated_completion_hours}h</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Side Info */}
                                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <Badge
                                      variant={task.status === 'pending' ? 'pending' : 'inProgress'}
                                      className="animate-in zoom-in"
                                    >
                                      {task.status === 'pending' ? 'Pending' : 'In Progress'}
                                    </Badge>

                                    <div className={cn(
                                      "text-right font-bold text-sm px-2 py-1 rounded-md",
                                      urgency === 'overdue' && "text-destructive bg-destructive/10",
                                      urgency === 'critical' && "text-destructive",
                                      urgency === 'urgent' && "text-amber-500",
                                      urgency === 'normal' && "text-primary"
                                    )}>
                                      {formatTimeRemaining(task.deadline)}
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {isCreator && (
                                          <>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingReports(task.id); }}>
                                              <FileText className="h-4 w-4 mr-2" />
                                              View Reports
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => { e.stopPropagation(); setDeletingTask(task.id); }}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        {!isCreator && (
                                          <>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit Task
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEstimatingTask(task); }}>
                                              <Clock className="h-4 w-4 mr-2" />
                                              Set Estimated Time
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => { e.stopPropagation(); setDecliningTask(task.id); }}
                                              className="text-destructive"
                                            >
                                              <XCircle className="h-4 w-4 mr-2" />
                                              Cannot Complete
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Progress Section */}
                                <div className="space-y-2">
                                  <FireProgress deadline={task.deadline} createdAt={task.created_at} />
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground font-medium">Task Progress</span>
                                      <span className="font-bold">{completionPercentage}%</span>
                                    </div>
                                    <Progress 
                                      value={completionPercentage} 
                                      className="h-2 group-hover:h-2.5 transition-all [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/50" 
                                    />
                                  </div>
                                </div>

                                {/* Decline Reason */}
                                {task.decline_reason && (
                                  <div className="flex gap-2 p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg animate-in slide-in-from-left-2">
                                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-destructive">Cannot Complete</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{task.decline_reason}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Hover Arrow */}
                                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Tasks */}
            {filteredTasks.filter(t => t.status === "completed").length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-lg py-3 z-20 border-b-2">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-success to-success/50 bg-clip-text text-transparent">
                    Completed Tasks
                  </h3>
                  <Badge variant="secondary" className="ml-auto bg-success/10 text-success border-success/20">
                    {filteredTasks.filter(t => t.status === "completed").length} completed
                  </Badge>
                </div>

                {Object.entries(groupedTasks).map(([month, monthTasks]) => {
                  const completedTasks = monthTasks.filter(t => t.status === "completed" && filteredTasks.includes(t));
                  if (completedTasks.length === 0) return null;
                  
                  return (
                    <div key={month} className="space-y-3">
                      <div className="flex items-center gap-2 px-2">
                        <Calendar className="h-4 w-4 text-success" />
                        <h4 className="text-lg font-semibold text-success">{month}</h4>
                      </div>

                      <div className="grid gap-3">
                        {completedTasks.map((task, index) => (
                          <Card
                            key={task.id}
                            className={cn(
                              "group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2 border-success/20 cursor-pointer",
                              "bg-gradient-to-br from-success/5 to-transparent",
                              "animate-in fade-in slide-in-from-left-4"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => window.location.href = `/task/${task.id}`}
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 opacity-5">
                              <CheckCircle2 className="h-24 w-24 text-success" />
                            </div>

                            <div className="relative p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                                      <CheckCircle2 className="h-5 w-5 text-success" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-lg truncate opacity-75 group-hover:opacity-100 transition-opacity">
                                        {task.title}
                                      </h4>
                                      {task.description && (
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                      <User className="h-3 w-3 text-success" />
                                      <span className="font-medium">{task.assigned_to_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded-md">
                                      <Calendar className="h-3 w-3 text-muted-foreground" />
                                      <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  <Badge variant="completed" className="animate-in zoom-in">
                                    Completed
                                  </Badge>
                                  
                                  {isCreator && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewingReports(task.id); }}>
                                          <FileText className="h-4 w-4 mr-2" />
                                          View Reports
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task.id); }}>
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={(e) => { e.stopPropagation(); setDeletingTask(task.id); }}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>

                              <Progress value={100} className="h-1.5 mt-4 [&>div]:bg-success" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {editingTask && (
        <EditTaskDialog
          taskId={editingTask}
          organizationId={organizationId}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {viewingReports && (
        <TaskReportsDialog
          taskId={viewingReports}
          open={!!viewingReports}
          onOpenChange={(open) => !open && setViewingReports(null)}
        />
      )}

      {decliningTask && (
        <TaskDeclineDialog
          taskId={decliningTask}
          open={!!decliningTask}
          onOpenChange={(open) => !open && setDecliningTask(null)}
          onDeclineSubmitted={handleTaskUpdated}
        />
      )}

      {estimatingTask && (
        <EstimatedTimeDialog
          taskId={estimatingTask.id}
          currentEstimate={estimatingTask.estimated_completion_hours}
          open={!!estimatingTask}
          onOpenChange={(open) => !open && setEstimatingTask(null)}
          onEstimateUpdated={handleTaskUpdated}
        />
      )}

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTask && handleDeleteTask(deletingTask)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}