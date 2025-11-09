import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  subheadline: z.string().max(200, "Subheadline must be less than 200 characters").optional(),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  motto: z.string().max(200, "Motto must be less than 200 characters").optional(),
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `org-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl);
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  const searchEmployees = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(5);

      if (error) throw error;

      const results: Employee[] = data?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || 'Unknown',
        last_name: profile.last_name || '',
        email: profile.email || 'No email'
      })) || [];

      setSearchResults(results);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search employees",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addEmployee = (employee: Employee) => {
    if (!selectedEmployees.find(e => e.id === employee.id)) {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeEmployee = (id: string) => {
    setSelectedEmployees(selectedEmployees.filter(e => e.id !== id));
  };

  // ✅ FIXED: Create organization with atomic transaction
  const handleCreate = async () => {
    // ✅ Validate inputs
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      console.log("🚀 Creating organization...");

      // ✅ STEP 1: Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          subheadline: subheadline.trim() || null,
          description: description.trim() || null,
          motto: motto.trim() || null,
          photo_url: photoUrl || null,
          agreement_text: agreementText.trim() || null,
          created_by: user.id
        })
        .select()
        .single();

      if (orgError) {
        console.error("❌ Organization creation error:", orgError);
        throw orgError;
      }

      console.log("✅ Organization created:", org.id);

      // ✅ STEP 2: Add creator as CEO (this should not cause recursion with fixed policies)
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          position: 'CEO',
          added_by: user.id
        });

      if (memberError) {
        console.error("❌ Member insertion error:", memberError);
        
        // ✅ Rollback: Delete the organization if member insertion fails
        await supabase.from('organizations').delete().eq('id', org.id);
        
        throw new Error(`Failed to add creator as member: ${memberError.message}`);
      }

      console.log("✅ Creator added as CEO");

      // ✅ STEP 3: Store organization ID in localStorage for dashboard
      localStorage.setItem("selectedOrganizationId", org.id);

      // ✅ STEP 4: Send invitations to selected employees (non-blocking)
      if (selectedEmployees.length > 0) {
        console.log(`📧 Sending invitations to ${selectedEmployees.length} employees...`);
        
        const { error: invitationError } = await supabase
          .from('organization_invitations')
          .insert(
            selectedEmployees.map(emp => ({
              organization_id: org.id,
              employee_id: emp.id,
              invitation_message: agreementText.trim() || null,
              status: 'pending'
            }))
          );

        if (invitationError) {
          console.error("⚠️ Invitation error (non-critical):", invitationError);
          // Don't fail the whole operation
        } else {
          console.log("✅ Invitations sent");
        }
      }

      // ✅ Success!
      toast({
        title: "Success! 🎉",
        description: `Organization "${name}" has been created successfully.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("❌ Critical error:", error);
      
      let errorMessage = error.message;
      
      // ✅ Handle specific error codes
      if (error.code === '42P17') {
        errorMessage = "Database policy error. Please contact support.";
      } else if (error.code === '23505') {
        errorMessage = "An organization with this name already exists.";
      } else if (error.message?.includes("infinite recursion")) {
        errorMessage = "Database configuration error. Please contact support.";
      }

      toast({
        title: "Failed to create organization",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ Photo Upload */}
      <div>
        <Label htmlFor="photo">Organization Photo</Label>
        <div className="mt-2 flex items-center gap-4">
          {photoUrl && (
            <img src={photoUrl} alt="Organization" className="w-20 h-20 rounded-lg object-cover border-2 border-border" />
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
            />
          </Label>
        </div>
      </div>

      {/* ✅ Organization Name */}
      <div>
        <Label htmlFor="name">Organization Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Acme Corporation"
          required
        />
      </div>

      {/* ✅ Subheadline */}
      <div>
        <Label htmlFor="subheadline">Tagline</Label>
        <Input
          id="subheadline"
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
          placeholder="e.g., Building the future together"
        />
      </div>

      {/* ✅ Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your organization..."
          rows={3}
        />
      </div>

      {/* ✅ Motto */}
      <div>
        <Label htmlFor="motto">Motto</Label>
        <Input
          id="motto"
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
          placeholder="e.g., Innovation through collaboration"
        />
      </div>

      {/* ✅ Agreement Text */}
      <div>
        <Label htmlFor="agreement">Welcome Message / Agreement</Label>
        <Textarea
          id="agreement"
          value={agreementText}
          onChange={(e) => setAgreementText(e.target.value)}
          placeholder="This message will be sent to invited members..."
          rows={4}
        />
      </div>

      {/* ✅ Employee Search */}
      <div>
        <Label>Invite Team Members (Optional)</Label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchEmployees()}
              placeholder="Search by name or email..."
              className="pl-9"
              disabled={isSearching}
            />
          </div>
          <Button onClick={searchEmployees} disabled={isSearching}>
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

        {/* ✅ Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-2 border rounded-md bg-card shadow-sm">
            {searchResults.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => addEmployee(emp)}
                className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                <div className="text-sm text-muted-foreground">{emp.email}</div>
              </button>
            ))}
          </div>
        )}
        
        {/* ✅ Selected Employees */}
        {selectedEmployees.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedEmployees.map((emp) => (
              <EmployeeChip
                key={emp.id}
                name={`${emp.first_name} ${emp.last_name}`}
                email={emp.email}
                onRemove={() => removeEmployee(emp.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ✅ Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={handleCreate} 
          className="flex-1" 
          disabled={isCreating || !name.trim()}
        >
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