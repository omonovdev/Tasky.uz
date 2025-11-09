import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Organization {
  id: string;
  name: string;
  subheadline: string;
  description: string;
  photo_url: string;
  created_by: string;
}

export default function OrganizationSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [searching, setSearching] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserOrganizations();
  }, []);

  const fetchUserOrganizations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    if (data) {
      setUserOrganizations(data.map(m => m.organization_id));
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleViewOrganization = (orgId: string) => {
    navigate(`/organization/${orgId}`);
  };

  const isMember = (orgId: string) => userOrganizations.includes(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Find Organizations
        </CardTitle>
        <CardDescription>
          Search for organizations to view and join
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {searching && (
          <div className="text-sm text-muted-foreground">Searching...</div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((org) => (
              <Card 
                key={org.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewOrganization(org.id)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {org.photo_url ? (
                      <img 
                        src={org.photo_url} 
                        alt={org.name} 
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-bold text-primary">
                          {org.name[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base truncate">{org.name}</h3>
                          {org.subheadline && (
                            <p className="text-sm text-muted-foreground truncate">
                              {org.subheadline}
                            </p>
                          )}
                        </div>
                        {isMember(org.id) && (
                          <Badge variant="secondary" className="flex-shrink-0">Member</Badge>
                        )}
                      </div>
                      {org.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {org.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No organizations found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
