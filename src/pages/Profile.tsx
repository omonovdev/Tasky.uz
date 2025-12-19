import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Camera, 
  LogOut, 
  Save, 
  Lock, 
  Trash2, 
  Moon, 
  Sun, 
  Globe, 
  Edit, 
  Upload,
  User as UserIcon,
  Mail,
  Calendar,
  Building2,
  Briefcase,
  Shield,
  Check,
  X,
  Sparkles,
  Key
} from "lucide-react";
import ProfileTaskStats from "@/components/ProfileTaskStats";
import { cn } from "@/lib/utils";
import WinterBackground from "@/components/WinterBackground";

interface ProfileData {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  organization: string | null;
  position: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface UserRole {
  role: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    date_of_birth: null,
    organization: null,
    position: null,
    avatar_url: null,
    email: null,
  });
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "ru" | "uz">(i18n.language as "en" | "ru" | "uz");
  const [tempLanguage, setTempLanguage] = useState<"en" | "ru" | "uz">(i18n.language as "en" | "ru" | "uz");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const { toast } = useToast();
  
  const handleLanguageChange = () => {
  setLanguage(tempLanguage);
  i18n.changeLanguage(tempLanguage);
  localStorage.setItem('language', tempLanguage);
  document.documentElement.lang = tempLanguage; // accessibility uchun
};


  useEffect(() => {
    fetchProfile();
    fetchUserRole();
  }, []);

  const fetchProfile = async () => {
    try {
      const me = await api.users.me();
      setProfile({
        first_name: me?.firstName || me?.email?.split("@")?.[0] || "",
        last_name: me?.lastName || "",
        date_of_birth: me?.dateOfBirth || null,
        organization: me?.organization || null,
        position: me?.position || null,
        avatar_url: me?.avatarUrl || null,
        email: me?.email || null,
      });

    } catch (err) {
      console.error("Error fetching profile:", err);
      navigate("/auth");
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

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setPendingAvatarPreview(previewUrl);
    setAvatarDialogOpen(true);
  };

  const cropImageToSquare = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;

        const canvas = document.createElement("canvas");
        const targetSize = 512;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.drawImage(
          img,
          offsetX,
          offsetY,
          size,
          size,
          0,
          0,
          targetSize,
          targetSize
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error("Failed to create image blob"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.9
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  };

  const handleConfirmAvatar = async () => {
    if (!pendingAvatarFile) return;

    try {
      setUploading(true);
      const croppedBlob = await cropImageToSquare(pendingAvatarFile);
      const croppedFile = new File([croppedBlob], "avatar.jpg", {
        type: "image/jpeg",
      });

      const uploaded = await api.uploads.upload(croppedFile, "avatars");
      await api.users.updateMe({ avatarUrl: uploaded.url });
      setProfile({ ...profile, avatar_url: uploaded.url });
      setAvatarDialogOpen(false);
      setPendingAvatarFile(null);
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
        setPendingAvatarPreview(null);
      }
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
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

  const handleDeleteAvatar = async () => {
    try {
      setUploading(true);
      await api.users.updateMe({ avatarUrl: null });

      setProfile({ ...profile, avatar_url: null });
      toast({
        title: "Success",
        description: "Avatar deleted successfully",
      });
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

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);

      await api.users.updateMe({
        firstName: profile.first_name,
        lastName: profile.last_name,
        dateOfBirth: profile.date_of_birth || undefined,
        organization: profile.organization || undefined,
        position: profile.position || undefined,
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
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

  const handleSignOut = async () => {
    await api.auth.logout();
    navigate("/auth");
  };

  const verifyCurrentPassword = async () => {
    try {
      await api.auth.verifyPassword({ password: passwords.current });

      setCurrentPasswordVerified(true);
      toast({
        title: "Success",
        description: "Current password verified",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Current password is incorrect",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    try {
      if (passwords.new !== passwords.confirm) {
        toast({
          title: "Error",
          description: "New passwords don't match",
          variant: "destructive",
        });
        return;
      }

      await api.auth.changePassword({
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setIsChangingPassword(false);
      setCurrentPasswordVerified(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      toast({
        title: "Deleting account...",
        description: "We're removing your account and related data.",
      });

      await api.users.deleteMe();
      await api.auth.logout();
      localStorage.removeItem("selectedOrganizationId");
      navigate("/auth");

      toast({
        title: "Account deleted",
        description: "Your account and all related data have been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} mode`,
    });
  };

  const getInitials = () => {
    return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
  };

  return (
    <div className="min-h-screen max-h-screen overflow-y-auto pb-24 relative">
      <WinterBackground />
      <div className="container max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              {t("profile.title")}
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-16">{t("profile.subtitle")}</p>
        </div>

        {/* Profile Card */}
        <Card className="animate-fade-in border-0 overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-2xl" style={{ animationDelay: "100ms" }}>
          <div className="relative h-32 bg-gradient-to-r from-primary via-primary/80 to-accent">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEyYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMTIgMTJjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
          </div>
          
          <CardContent className="pt-0 pb-8">
            <div className="flex flex-col items-center -mt-16 mb-6">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-900 shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800 transition-transform duration-300 group-hover:scale-105">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/70 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <label 
                  htmlFor="avatar-upload" 
                  className={cn(
                    "absolute bottom-2 right-2 p-2.5 rounded-full cursor-pointer transition-all duration-300",
                    "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700",
                    "hover:bg-primary hover:border-primary hover:scale-110 shadow-lg",
                    "group/btn"
                  )}
                >
                  <Camera className="h-4 w-4 text-slate-600 dark:text-slate-400 group-hover/btn:text-white transition-colors" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                    disabled={uploading}
                  />
                </label>

                {profile.avatar_url && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={uploading}
                    className={cn(
                      "absolute top-2 right-2 p-2 rounded-full transition-all duration-300",
                      "bg-red-500 hover:bg-red-600 border-2 border-white dark:border-slate-900",
                      "hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>

              <div className="text-center mt-4 space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.first_name} {profile.last_name}
                </h2>
                
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {userRole && (
                    <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white shadow-md">
                      <Shield className="h-3 w-3 mr-1" />
                      {t(`profile.role.${userRole}`, userRole)}
                    </Badge>
                  )}
                  {profile.position && (
                    <Badge variant="secondary" className="shadow-sm">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {profile.position}
                    </Badge>
                  )}
                </div>

                {profile.email && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("profile.personalInfo")}
                  </h3>
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    variant="outline"
                    className="hover:bg-primary hover:text-white transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t("profile.editProfile")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">{t("profile.firstName")}</Label>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white ml-11">
                      {profile.first_name || <span className="text-slate-400">{t("profile.notSet")}</span>}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <UserIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">{t("profile.lastName")}</Label>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white ml-11">
                      {profile.last_name || <span className="text-slate-400">{t("profile.notSet")}</span>}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">{t("profile.dateOfBirth")}</Label>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white ml-11">
                      {profile.date_of_birth || <span className="text-slate-400">{t("profile.notSet")}</span>}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">{t("profile.organization")}</Label>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white ml-11">
                      {profile.organization || <span className="text-slate-400">{t("profile.notSet")}</span>}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Edit Profile
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-primary" />
                      {t("profile.firstName")}
                    </Label>
                    <Input
                      id="firstName"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-primary" />
                      {t("profile.lastName")}
                    </Label>
                    <Input
                      id="lastName"
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value })
                      }
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {t("profile.dateOfBirth")}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profile.date_of_birth || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, date_of_birth: e.target.value })
                      }
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {t("profile.organization")}
                    </Label>
                    <Input
                      id="organization"
                      value={profile.organization || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, organization: e.target.value })
                      }
                      placeholder={t("profile.organizationPlaceholder")}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="position" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      {t("profile.position")}
                    </Label>
                    <Input
                      id="position"
                      value={profile.position || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, position: e.target.value })
                      }
                      placeholder={t("profile.positionPlaceholder")}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg transition-all duration-200"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? t("profile.saving") : t("profile.save")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      fetchProfile();
                    }}
                    variant="outline"
                    className="flex-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t("profile.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Performance Stats */}
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <ProfileTaskStats />
        </div>

        {/* Settings Card */}
        <Card className="animate-fade-in border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/20 shadow-lg" style={{ animationDelay: "300ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              {t("profile.settings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Password */}
            {!isChangingPassword ? (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-primary/10 transition-colors">
                    <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-slate-900 dark:text-white">{t("profile.changePassword")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("profile.passwordSubtitle")}
                    </p>
                  </div>
                  <Edit className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ) : (
              <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t("profile.changePassword")}</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    disabled={currentPasswordVerified}
                    className="transition-all duration-200"
                  />
                </div>
                
                {!currentPasswordVerified ? (
                  <div className="flex gap-2">
                    <Button onClick={verifyCurrentPassword} className="flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      {t("profile.verifyPassword")}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswords({ current: "", new: "", confirm: "" });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      {t("profile.cancel")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwords.new}
                        onChange={(e) =>
                          setPasswords({ ...passwords, new: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) =>
                          setPasswords({ ...passwords, confirm: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleChangePassword} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600">
                        <Save className="h-4 w-4 mr-2" />
                        {t("profile.savePassword")}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsChangingPassword(false);
                          setCurrentPasswordVerified(false);
                          setPasswords({ current: "", new: "", confirm: "" });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        {t("profile.cancel")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <Separator />

            {/* Theme Mode */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    {theme === "light" ? (
                      <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Moon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{t("profile.themeMode")}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {theme === "light" ? t("profile.lightMode") : t("profile.darkMode")}
                    </p>
                  </div>
                </div>
                <Button onClick={toggleTheme} variant="outline" size="sm" className="hover:bg-primary hover:text-white transition-all">
                  {theme === "light" ? t("profile.darkMode") : t("profile.lightMode")}
                </Button>
              </div>
            </div>

            {/* Language */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t("profile.language")}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("profile.languageSubtitle")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mb-3">
                {[
                  { code: "en", label: t("profile.languages.en") },
                  { code: "ru", label: t("profile.languages.ru") },
                  { code: "uz", label: t("profile.languages.uz") }
                ].map(({ code, label }) => (
                  <Button
                    key={code}
                    onClick={() => setTempLanguage(code as any)}
                    variant={tempLanguage === code ? "default" : "outline"}
                    size="sm"
                    className="flex-1 transition-all duration-200"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {tempLanguage !== language && (
                <Button 
                  onClick={handleLanguageChange} 
                  className="w-full bg-gradient-to-r from-primary to-primary/80" 
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t("profile.changeLanguage")}
                </Button>
              )}
            </div>

            {/* Avatar crop/edit dialog */}
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("profile.changeAvatar") || "Change avatar"}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {pendingAvatarPreview ? (
                      <img
                        src={pendingAvatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-slate-500">
                        {t("profile.selectAvatar") || "Select a photo"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    {t("profile.avatarHint") ||
                      "Image will be automatically cropped to a square (1:1). You can preview how it will look before saving."}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAvatarDialogOpen(false);
                      setPendingAvatarFile(null);
                      if (pendingAvatarPreview) {
                        URL.revokeObjectURL(pendingAvatarPreview);
                        setPendingAvatarPreview(null);
                      }
                    }}
                  >
                    {t("common.cancel") || "Cancel"}
                  </Button>
                  <Button onClick={handleConfirmAvatar} disabled={uploading || !pendingAvatarFile}>
                    {uploading ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        {t("profile.saving") || "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t("profile.saveAvatar") || "Save avatar"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="animate-fade-in border-0 bg-red-50/80 dark:bg-red-950/30 backdrop-blur-xl ring-1 ring-red-200/50 dark:ring-red-900/50 shadow-lg" style={{ animationDelay: "400ms" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Trash2 className="h-5 w-5" />
              </div>
              {t("profile.dangerZone")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full justify-start hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 hover:text-red-600 transition-all duration-200 group"
            >
              <LogOut className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
              {t("profile.signOut")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("profile.deleteAccount")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("profile.deleteAccountTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("profile.deleteAccountConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("profile.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("profile.deleteAccount")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
