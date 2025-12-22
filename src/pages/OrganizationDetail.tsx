import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import BackButton from "@/components/BackButton";
import { 
  Users, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  Award,
  Upload,
  X,
  Edit3,
  Trash2,
  Plus,
  Calendar,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditOrganizationDialog from "@/components/EditOrganizationDialog";
import TasksList from "@/components/TasksList";
import MemberManagement from "@/components/MemberManagement";
import AgreementDialog from "@/components/AgreementDialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import WinterBackground from "@/components/WinterBackground";

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">("pending");
  const [loading, setLoading] = useState(true);
  
  // ✨ NEW: Photo management states
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Task Statistics State
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    urgent: 0,
  });

  useEffect(() => {
    const initialize = async () => {
      await fetchOrganization();
      await fetchUserRole();
      await fetchTaskStats();
    };
    initialize();
  }, [id]);

  const fetchTaskStats = async () => {
    try {
      if (!id) return;
      if (id.startsWith("11111111-")) {
        setStats({
          total: 0,
          completed: 0,
          inProgress: 0,
          urgent: 0,
        });
        setLoading(false);
        return;
      }

      const tasks = await api.tasks.list({ organizationId: id, all: true });
      const now = new Date();

      const completed = (tasks || []).filter((t: any) => t.status === "completed").length;
      const inProgress = (tasks || []).filter((t: any) =>
        t.status === "in_progress" || t.status === "pending"
      ).length;
      
      const urgent = (tasks || []).filter((t: any) => {
        if (!t.deadline || t.status === "completed") return false;
        const deadline = new Date(t.deadline);
        const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursLeft < 72 && hoursLeft > 0;
      }).length;

      setStats({
        total: tasks?.length || 0,
        completed,
        inProgress,
        urgent,
      });
    } catch (error) {
      console.error("Error fetching task stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const data = await api.users.getMyRole();
      if (data?.role) setUserRole(data.role);
    } catch (error: any) {
      console.error("Error fetching role:", error);
    }
  };

  const fetchOrganization = async () => {
    try {
      if (!id) return;
      const data = await api.organizations.get(id);

      setOrganization({
        id: data.id,
        name: data.name,
        subheadline: data.subheadline || "",
        description: data.description || "",
        motto: data.motto || "",
        photo_url: data.photoUrl || "",
        created_by: data.createdBy,
        agreement_text: data.agreementText ?? null,
      });

      const meId = authJwt.getUserId();
      setIsCreator(Boolean(meId && data.createdBy === meId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load organization",
        variant: "destructive",
      });
    }
  };

  // ✨ NEW: Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast({
      title: "Invalid File",
      description: "Please select an image file.",
      variant: "destructive",
    });
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast({
      title: "File too large",
      description: "Max file size is 5MB.",
      variant: "destructive",
    });
    return;
  }

  setSelectedFile(file);

  const reader = new FileReader();
  reader.onloadend = () => {
    setPreviewUrl(reader.result as string);
    setShowPhotoDialog(true);
  };
  reader.readAsDataURL(file);
};

  // ✨ NEW: Upload photo to storage
  const handlePhotoUpload = async () => {
  if (!selectedFile || !id) return;

  try {
    setUploading(true);

    // 1. Generate file name
    const ext = selectedFile.name.split(".").pop();
    const fileName = `org-${id}-${Date.now()}.${ext}`;
    const storagePath = `organizations/${fileName}`;

    // 2. Remove OLD PHOTO properly
    if (organization?.photo_url) {
      // Convert PUBLIC URL → STORAGE PATH
      const cleanPath = organization.photo_url.split("/avatars/")[1];
      if (cleanPath) {
        // Old file cleanup skipped (local uploads)
      }
    }

    const uploaded = await api.uploads.upload(selectedFile, "org_photos");
    const finalUrl = `${uploaded.url}?t=${Date.now()}`;

    await api.organizations.update(id, { photoUrl: finalUrl });

    toast({
      title: "Success",
      description: "Organization photo updated successfully.",
    });

    // 7. Cleanup + Refresh
    setShowPhotoDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    fetchOrganization();

  } catch (error: any) {
    toast({
      title: "Upload Failed",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setUploading(false);
  }
};

  // ✨ NEW: Delete photo
  const handlePhotoDelete = async () => {
  if (!id || !organization?.photo_url) return;

  try {
    setUploading(true);

    // Convert PUBLIC URL → STORAGE PATH
    const cleanPath = organization.photo_url.split("/avatars/")[1];

    // Update DB
    await api.organizations.update(id, { photoUrl: null });

    toast({
      title: "Success",
      description: "Organization photo removed.",
    });

    setShowDeleteConfirm(false);
    fetchOrganization();

  } catch (error: any) {
    toast({
      title: "Delete Failed",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setUploading(false);
  }
};

  const handleStatCardClick = (status: string) => {
    if (!organization) return;
    navigate(`/task-status/${organization.id}/${status}`);
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading || !organization) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 max-h-screen overflow-y-auto relative">
      <WinterBackground />
      <div className="container mx-auto p-6 pb-24 space-y-6 relative z-10">
        <BackButton />
        
        {/* Hero Section with Organization Info */}
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-0 ring-1 ring-white/30 dark:ring-primary/20 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700 mt-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* ✨ ENHANCED: Organization Photo */}
              <div className="relative group flex-shrink-0">
                {organization.photo_url ? (
                  <div className="relative">
                    <img 
                      src={organization.photo_url}
  key={organization.photo_url} 
                      alt={organization.name} 
                      className="w-32 h-32 object-cover rounded-2xl border-4 border-background shadow-2xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105"
                    />
                    { (
                      <>
                        {/* Edit Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          <div className="flex gap-2">
                            <label
                              htmlFor="org-photo-upload"
                              className="cursor-pointer p-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors"
                            >
                              <Edit3 className="w-5 h-5 text-primary-foreground" />
                              <input
                                id="org-photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={uploading}
                              />
                            </label>
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="p-2 bg-destructive rounded-lg hover:bg-destructive/80 transition-colors"
                            >
                              <Trash2 className="w-5 h-5 text-destructive-foreground" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Change Photo Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-4 w-4" />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/50 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                      <span className="text-5xl font-bold text-primary-foreground">
                        {organization.name[0]}
                      </span>
                    </div>
                    {isCreator && userRole === "employer" && (
                      <>
                        <label
                          htmlFor="org-photo-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm"
                        >
                          <div className="flex flex-col items-center text-white">
                            <Upload className="w-8 h-8 mb-2" />
                            <span className="text-sm font-semibold">Add Photo</span>
                          </div>
                          <input
                            id="org-photo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={uploading}
                          />
                        </label>
                        
                        <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-bounce">
                          <Camera className="h-4 w-4" />
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-bounce">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              
              {/* Organization Details */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {organization.name}
                    </h1>
                    {organization.subheadline && (
                      <p className="text-xl text-muted-foreground mt-1">{organization.subheadline}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={() => setShowMembersDialog(true)} 
                      variant="outline"
                      className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <Users className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                      {t("organizationPage.membersButton")}
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
                  <div className="flex items-center gap-2 p-3 bg-background/50 backdrop-blur rounded-lg border border-primary/10">
                    <Target className="h-5 w-5 text-primary flex-shrink-0" />
                    <p className="text-muted-foreground italic">"{organization.motto}"</p>
                  </div>
                )}
                
                {organization.description && (
                  <p className="text-muted-foreground">{organization.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-5 duration-700 delay-100 bg-gradient-to-r from-primary/5 to-accent/5 p-6 rounded-xl border border-primary/10 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              {t("organizationDetail.performanceTitle")}
            </h2>
            <p className="text-muted-foreground mt-1">{t("organizationDetail.performanceSubtitle")}</p>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{completionRate}%</div>
              <div className="text-xs text-muted-foreground">{t("organizationDetail.completion")}</div>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">{t("organizationDetail.done")}</div>
            </div>
            <Award className="h-10 w-10 text-primary animate-pulse" />
          </div>

          <Button
            className="mt-4 md:mt-0 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full px-6 shadow-lg hover:shadow-xl flex items-center gap-2"
            onClick={() => navigate(`/organization/${organization.id}/stats`)}
          >
            <TrendingUp className="h-4 w-4" />
            {t("dashboardExtended.viewOrgStats")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Task Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: t("organizationDetail.cards.total"),
              value: stats.total,
              subtitle: t("organizationDetail.cards.totalSubtitle"),
              icon: CheckCircle2,
              color: "text-blue-500",
              bgColor: "from-blue-500/10 to-blue-500/5",
              borderColor: "border-blue-500/20",
              hoverColor: "hover:border-blue-500/40",
              status: 'all',
              delay: 0
            },
            {
              title: t("organizationDetail.cards.completed"),
              value: stats.completed,
              subtitle: t("organizationDetail.cards.completedSubtitle", { rate: completionRate }),
              icon: CheckCircle2,
              color: "text-success",
              bgColor: "from-success/10 to-success/5",
              borderColor: "border-success/20",
              hoverColor: "hover:border-success/40",
              status: 'completed',
              delay: 100
            },
            {
              title: t("organizationDetail.cards.inProgress"),
              value: stats.inProgress,
              subtitle: t("organizationDetail.cards.inProgressSubtitle"),
              icon: Clock,
              color: "text-primary",
              bgColor: "from-primary/10 to-primary/5",
              borderColor: "border-primary/20",
              hoverColor: "hover:border-primary/40",
              status: 'in_progress',
              delay: 200
            },
            {
              title: t("organizationDetail.cards.urgent"),
              value: stats.urgent,
              subtitle: t("organizationDetail.cards.urgentSubtitle"),
              icon: AlertCircle,
              color: "text-destructive",
              bgColor: "from-destructive/10 to-destructive/5",
              borderColor: "border-destructive/20",
              hoverColor: "hover:border-destructive/40",
              status: 'urgent',
              delay: 300
            }
          ].map((stat) => (
            <Card
              key={stat.title}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 animate-in fade-in slide-in-from-top-6",
                `bg-gradient-to-br ${stat.bgColor}`,
                stat.borderColor,
                stat.hoverColor
              )}
              style={{ animationDelay: `${stat.delay}ms` }}
              onClick={() => handleStatCardClick(stat.status)}
            >
              <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 opacity-20">
                <stat.icon className={cn("h-32 w-32", stat.color)} />
              </div>
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur shadow-lg group-hover:scale-110 transition-transform")}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <div className={cn("text-4xl font-bold mb-1 group-hover:scale-110 transition-transform", stat.color)}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                
                {stat.title === "Completed" && stats.total > 0 && (
                  <Progress value={completionRate} className="h-2 mt-3" />
                )}
              </CardContent>
              
              <div className="absolute bottom-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>

        {/* Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("organizationPage.membersTitle")}
              </DialogTitle>
            </DialogHeader>
            <MemberManagement 
              organizationId={id!} 
              creatorId={organization.created_by}
              isCreator={isCreator && userRole === "employer"}
            />
          </DialogContent>
        </Dialog>

        {/* ✨ NEW: Photo Upload Dialog */}
        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Update Organization Photo
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {previewUrl && (
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-primary/20">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={handlePhotoUpload}
                  disabled={uploading || !selectedFile}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPhotoDialog(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={uploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ✨ NEW: Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Delete Organization Photo
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to remove the organization photo? This action cannot be undone.
              </p>
              
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handlePhotoDelete}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Photo
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={uploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
