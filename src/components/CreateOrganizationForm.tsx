import { ChangeEvent, useState } from "react";
import { api } from "@/lib/api";
import { authJwt } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Loader2 } from "lucide-react";
import { EmployeeChip } from "./EmployeeChip";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  subheadline: z
    .string()
    .max(200, "Subheadline must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  motto: z
    .string()
    .max(200, "Motto must be less than 200 characters")
    .optional(),
});

interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface CreateOrganizationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateOrganizationForm = ({ onSuccess, onCancel }: CreateOrganizationFormProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [description, setDescription] = useState("");
  const [motto, setMotto] = useState("");
  const [agreementText, setAgreementText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await api.uploads.upload(file, "org_photos");
      setPhotoUrl(uploaded.url);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload photo",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const searchEmployees = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    try {
      setIsSearching(true);
      const exclude = authJwt.getUserId() || undefined;
      const results = await api.users.search(q, exclude);
      const mapped: Employee[] = (results || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        first_name: u.firstName,
        last_name: u.lastName,
      }));
      const selectedIds = new Set(selectedEmployees.map((e) => e.id));
      setSearchResults(mapped.filter((e) => !selectedIds.has(e.id)));
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error?.message || "Could not search users",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addEmployee = (emp: Employee) => {
    setSelectedEmployees((prev) => (prev.some((e) => e.id === emp.id) ? prev : [...prev, emp]));
    setSearchResults((prev) => prev.filter((e) => e.id !== emp.id));
  };

  const removeEmployee = (id: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCreate = async () => {
    const validation = organizationSchema.safeParse({
      name,
      subheadline,
      description,
      motto,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const org = await api.organizations.create({
        name: name.trim(),
        subheadline: subheadline.trim() || undefined,
        description: description.trim() || undefined,
        motto: motto.trim() || undefined,
        photoUrl: photoUrl || undefined,
        agreementText: agreementText.trim() || undefined,
      });

      localStorage.setItem("selectedOrganizationId", org.id);

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("organization-switched", {
        detail: { organizationId: org.id }
      }));

      if (selectedEmployees.length > 0) {
        await Promise.allSettled(
          selectedEmployees.map((emp) =>
            api.organizations.invite(org.id, {
              employeeId: emp.id,
              invitationMessage: agreementText.trim() || undefined,
            }),
          ),
        );
      }

      toast({
        title: t("success") || "Success",
        description: `Organization "${name.trim()}" has been created successfully.`,
      });

      setName("");
      setSubheadline("");
      setDescription("");
      setMotto("");
      setAgreementText("");
      setPhotoUrl("");
      setSelectedEmployees([]);
      setSearchQuery("");
      setSearchResults([]);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to create organization",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Upload */}
      <div>
        <Label htmlFor="photo">Organization Photo</Label>
        <div className="mt-2 flex items-center gap-4">
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Organization"
              className="w-20 h-20 rounded-lg object-cover border-2 border-border"
            />
          )}
          <Label htmlFor="photo-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
              <Upload className="w-4 h-4" />
              <span>{photoUrl ? "Change Photo" : "Upload Photo"}</span>
            </div>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isCreating}
            />
          </Label>
        </div>
      </div>

      {/* Organization Name */}
      <div>
        <Label htmlFor="name">
          Organization Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Acme Corporation"
          required
          disabled={isCreating}
          maxLength={100}
        />
      </div>

      {/* Subheadline */}
      <div>
        <Label htmlFor="subheadline">Tagline</Label>
        <Input
          id="subheadline"
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
          placeholder="e.g., Building the future together"
          disabled={isCreating}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your organization..."
          rows={3}
          disabled={isCreating}
          maxLength={2000}
        />
      </div>

      {/* Motto */}
      <div>
        <Label htmlFor="motto">Motto</Label>
        <Input
          id="motto"
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          placeholder="e.g., Innovation through collaboration"
          disabled={isCreating}
          maxLength={200}
        />
      </div>

      {/* Agreement Text */}
      <div>
        <Label htmlFor="agreement">Welcome Message / Agreement</Label>
        <Textarea
          id="agreement"
          value={agreementText}
          onChange={(e) => setAgreementText(e.target.value)}
          placeholder="This message will be sent to invited members..."
          rows={4}
          disabled={isCreating}
        />
      </div>

      {/* Employee Search */}
      <div>
        <Label>Invite Team Members (Optional)</Label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isSearching && searchEmployees()}
              placeholder="Search by name or email..."
              className="pl-9"
              disabled={isSearching || isCreating}
            />
          </div>
          <Button onClick={() => searchEmployees()} disabled={isSearching || isCreating || !searchQuery.trim()}>
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-md bg-card shadow-sm max-h-64 overflow-y-auto">
            {searchResults.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => addEmployee(emp)}
                disabled={isCreating}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-medium">
                  {emp.first_name} {emp.last_name}
                </div>
                <div className="text-sm text-muted-foreground">{emp.email}</div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Employees */}
        {selectedEmployees.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-2">
              Selected members ({selectedEmployees.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedEmployees.map((emp) => (
                <EmployeeChip
                  key={emp.id}
                  name={`${emp.first_name} ${emp.last_name}`}
                  email={emp.email}
                  onRemove={() => removeEmployee(emp.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleCreate} className="flex-1" disabled={isCreating || !name.trim()}>
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Organization"
          )}
        </Button>
        <Button onClick={onCancel} variant="outline" disabled={isCreating}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

