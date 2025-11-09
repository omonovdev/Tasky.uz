import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Camera, LogOut, Save, Lock, Trash2, Moon, Sun, Globe, MoreVertical, Edit, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileTaskStats from "@/components/ProfileTaskStats";

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
  const { toast } = useToast();
  
  const handleLanguageChange = () => {
    setLanguage(tempLanguage);
    i18n.changeLanguage(tempLanguage);
    localStorage.setItem('language', tempLanguage);
    // Force reload to apply translations throughout the entire app
    window.location.reload();
  };

  useEffect(() => {
    fetchProfile();
    fetchUserRole();
  }, []);

  const fetchProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // profiles dan hozirgi yozuvni olamiz (bo‘lsa)
    const { data: p, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error; // not found bo‘lsa xato hisoblamaymiz

    // auth.user.user_metadata ustuvor
    const meta = user.user_metadata || {};
    const metaFirst = (meta.first_name ?? "").toString().trim() || null;
    const metaLast  = (meta.last_name  ?? "").toString().trim() || null;
    const metaDob   = (meta.date_of_birth ?? "").toString().trim() || null;

    // Ekranga ko‘rsatiladigan yakuniy ma’lumot – user_metadata birinchi o‘rinda
    const merged: ProfileData = {
      first_name: metaFirst ?? p?.first_name ?? "",
      last_name:  metaLast  ?? p?.last_name  ?? "",
      date_of_birth: metaDob ?? p?.date_of_birth ?? null,
      organization: p?.organization ?? null,
      position:     p?.position ?? null,
      avatar_url:   p?.avatar_url ?? null,
      email:        user.email ?? null,
    };

    setProfile(merged);

    // Agar profiles jadvalidagi qiymatlar user_metadata dan orqada bo‘lsa, sinxronlaymiz.
    // (Bu update UI ni buzmaydi; setProfile allaqachon to‘g‘ri ma’lumotni ko‘rsatmoqda)
    const mustSync =
      !!p && (
        (metaFirst && p.first_name !== metaFirst) ||
        (metaLast  && p.last_name  !== metaLast ) ||
        (metaDob   && p.date_of_birth !== metaDob)
      );

    if (mustSync) {
      await supabase
        .from("profiles")
        .update({
          first_name: metaFirst ?? p.first_name,
          last_name:  metaLast  ?? p.last_name,
          date_of_birth: metaDob ?? p.date_of_birth,
        })
        .eq("id", user.id);
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
};



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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          date_of_birth: profile.date_of_birth,
          organization: profile.organization,
          position: profile.position,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

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
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const verifyCurrentPassword = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      setCurrentPasswordVerified(true);
      toast({
        title: "Success",
        description: "Current password verified",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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

      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Note: Actual account deletion would require an admin function
      // For now, we'll just sign out
      await supabase.auth.signOut();
      navigate("/auth");
      
      toast({
        title: "Account Deletion Requested",
        description: "Please contact support to complete account deletion.",
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
    <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 pb-24">
      <div className="container max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{t("profile.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("profile.personalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("profile.editProfile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("profile.uploadImage")}
                  </DropdownMenuItem>
                  {profile.avatar_url && (
                    <DropdownMenuItem onClick={handleDeleteAvatar} disabled={uploading}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("profile.deleteImage")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="relative group">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
              </div>
              
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <div className="text-center space-y-1">
                {userRole && (
                  <Badge variant="outline" className="capitalize">
                    {t(`profile.role.${userRole}`, userRole)}
                  </Badge>
                )}
                {profile.email && (
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                )}
              </div>
            </div>

            {/* Profile Content */}
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("profile.firstName")}</Label>
                    <p className="text-sm font-medium">{profile.first_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.lastName")}</Label>
                    <p className="text-sm font-medium">{profile.last_name}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.dateOfBirth")}</Label>
                  <p className="text-sm font-medium">{profile.date_of_birth || t("profile.notSet")}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.organization")}</Label>
                  <p className="text-sm font-medium">{profile.organization || t("profile.notSet")}</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.position")}</Label>
                  <p className="text-sm font-medium">{profile.position || t("profile.notSet")}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t("profile.firstName")}</Label>
                    <Input
                      id="firstName"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t("profile.lastName")}</Label>
                    <Input
                      id="lastName"
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">{t("profile.dateOfBirth")}</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile.date_of_birth || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, date_of_birth: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">{t("profile.organization")}</Label>
                  <Input
                    id="organization"
                    value={profile.organization || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, organization: e.target.value })
                    }
                    placeholder={t("profile.organizationPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">{t("profile.position")}</Label>
                  <Input
                    id="position"
                    value={profile.position || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, position: e.target.value })
                    }
                    placeholder={t("profile.positionPlaceholder")}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateProfile}
                    className="flex-1"
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
                    className="flex-1"
                  >
                    {t("profile.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Performance Stats */}
        <ProfileTaskStats />

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Password */}
            {!isChangingPassword ? (
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Lock className="w-4 h-4 mr-2" />
                {t("profile.changePassword")}
              </Button>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg">
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
                  />
                </div>
                
                {!currentPasswordVerified ? (
                  <div className="flex gap-2">
                    <Button onClick={verifyCurrentPassword} className="flex-1">
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
                      <Button onClick={handleChangePassword} className="flex-1">
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
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {theme === "light" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span className="font-medium">{t("profile.themeMode")}</span>
              </div>
              <Button onClick={toggleTheme} variant="outline" size="sm">
                {theme === "light" ? t("profile.darkMode") : t("profile.lightMode")}
              </Button>
            </div>

            {/* Language */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="font-medium">{t("profile.language")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setTempLanguage("en")}
                  variant={tempLanguage === "en" ? "default" : "outline"}
                  size="sm"
                >
                  EN
                </Button>
                <Button
                  onClick={() => setTempLanguage("ru")}
                  variant={tempLanguage === "ru" ? "default" : "outline"}
                  size="sm"
                >
                  RU
                </Button>
                <Button
                  onClick={() => setTempLanguage("uz")}
                  variant={tempLanguage === "uz" ? "default" : "outline"}
                  size="sm"
                >
                  UZ
                </Button>
              </div>
              {tempLanguage !== language && (
                <Button onClick={handleLanguageChange} className="w-full" size="sm">
                  {t("profile.changeLanguage")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t("profile.dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("profile.signOut")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start">
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
