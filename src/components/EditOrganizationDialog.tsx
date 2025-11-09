import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  description: string;
  motto: string;
  photo_url: string;
}

interface EditOrganizationDialogProps {
  organization: Organization;
  onUpdate: () => void;
}

export default function EditOrganizationDialog({ organization, onUpdate }: EditOrganizationDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState(organization.name);
  const [subheadline, setSubheadline] = useState(organization.subheadline);
  const [description, setDescription] = useState(organization.description);
  const [motto, setMotto] = useState(organization.motto);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let photoUrl = organization.photo_url;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${organization.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          name,
          subheadline,
          description,
          motto,
          photo_url: photoUrl,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: "Organization updated successfully",
      });

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: "Organization deleted successfully",
      });

      setDeleteDialogOpen(false);
      setOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Pencil className="w-4 h-4" />
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("organization.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("organization.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="subheadline">{t("organization.subheadline")}</Label>
            <Input
              id="subheadline"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">{t("organization.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="motto">{t("organization.motto")}</Label>
            <Input
              id="motto"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="photo">{t("organization.photo")}</Label>
            {organization.photo_url && (
              <div className="mb-2">
                <img src={organization.photo_url} alt="Current photo" className="w-32 h-32 rounded-lg object-cover mb-2" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('organizations')
                        .update({ photo_url: null })
                        .eq('id', organization.id);
                      
                      if (error) throw error;
                      
                      toast({
                        title: t("common.success"),
                        description: "Photo removed successfully",
                      });
                      onUpdate();
                    } catch (error: any) {
                      toast({
                        title: t("common.error"),
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {t("organization.removePhoto")}
                </Button>
              </div>
            )}
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? t("organization.saving") : t("organization.saveChanges")}
            </Button>
          </div>

          <div className="border-t pt-4 mt-6">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("organization.delete")}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("organization.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("organization.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
