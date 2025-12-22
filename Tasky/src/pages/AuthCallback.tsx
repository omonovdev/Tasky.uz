import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authStorage } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken && refreshToken) {
      // Save tokens to localStorage
      authStorage.setTokens({ accessToken, refreshToken });

      toast({
        title: "Login successful",
        description: "Welcome to Tasky!",
      });

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    } else {
      // No tokens found, redirect to auth page
      toast({
        title: "Authentication failed",
        description: "Unable to complete Google sign-in",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
    }
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Completing sign-in…</span>
      </div>
    </div>
  );
};

export default AuthCallback;

