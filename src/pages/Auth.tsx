import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, Phone, Send, Snowflake } from "lucide-react";
import Snowfall from "@/components/Snowfall";

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (isRegister) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.auth.register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
      });
      toast({
        title: "Success!",
        description: "Your account has been created successfully"
      });
      navigate("/dashboard");
    } catch (err: any) {
      let message = err.message || "Registration failed";
      if (message.includes("already registered")) message = "This email is already registered";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.auth.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in"
      });
      navigate("/dashboard");
    } catch (err: any) {
      let message = err.message || "Login failed";
      const lower = message.toLowerCase();

      // Tarmoq yoki fetch xatolari uchun register rejimiga o'tmasin
      if (
        lower.includes("failed to fetch") ||
        lower.includes("networkerror") ||
        lower.includes("network error") ||
        message.includes("<html") ||
        message.includes("502") ||
        message.includes("bad gateway")
      ) {
        message = "Server bilan bog'lanib bo'lmadi. Iltimos, keyinroq urinib ko'ring.";
        toast({
          title: "Login Failed",
          description: message,
          variant: "destructive"
        });
        return;
      }

      if (lower.includes("user not found") || lower.includes("not registered")) {
        setIsRegister(true);
        toast({
          title: "Account not found",
          description: "This email is not registered. Please create a new account.",
          variant: "destructive",
        });
        return;
      }

      if (lower.includes("invalid")) {
        message = "Invalid email or password";
      }
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4010/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    setErrors({});
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-950 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Winter Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-purple-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,160,255,0.1),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJzbm93IiB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc25vdykiLz48L3N2Zz4=')] opacity-40"></div>
      </div>

      <Snowfall />

      {/* Frosted Glass Card */}
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl relative z-10 ring-1 ring-white/20">
        <CardHeader className="text-center space-y-4 pb-4 pt-8">
          {/* Tasky Logo with Winter Theme */}
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-400/30 via-cyan-400/30 to-indigo-400/30 rounded-full"></div>
            <div className="relative flex items-center justify-center gap-3">
              <Snowflake className="h-10 w-10 text-blue-500 animate-spin drop-shadow-lg" style={{ animationDuration: '20s' }} />
              <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent drop-shadow-lg">
                Tasky
              </h1>
              <Snowflake className="h-7 w-7 text-cyan-400 animate-pulse drop-shadow-lg" />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2 pt-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <span className="text-blue-500">→</span>
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isRegister
                ? "Fill in your details to get started"
                : "Sign in to continue to your dashboard"
              }
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {/* Register-only fields */}
            {isRegister && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      className={errors.firstName ? "border-red-500" : ""}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={loading}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      className={errors.lastName ? "border-red-500" : ""}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={loading}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className={errors.dateOfBirth ? "border-red-500" : ""}
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={loading}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-xs text-red-500">{errors.dateOfBirth}</p>
                  )}
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm Password (Register only) */}
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 text-white py-6 text-base font-semibold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isRegister ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                <>
                  {isRegister ? "Create Account" : "Sign In"}
                  <Snowflake className="ml-2 h-4 w-4 inline animate-pulse" />
                </>
              )}
            </Button>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full py-6 text-base font-medium rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 backdrop-blur-sm bg-white/50 dark:bg-slate-900/50"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.9-6.9C35.5 2.5 30.2 0 24 0 14.6 0 6.5 5.9 2.6 14.4l8.05 6.26C12.58 14.46 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.15-3.14-.44-4.63H24v9.1h12.7c-.55 3-2.24 5.52-4.8 7.2l7.38 5.73C43.9 37.8 46.5 31.7 46.5 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.65 28.66a11.96 11.96 0 0 1-.63-3.66c0-1.27.23-2.5.63-3.66l-8.05-6.26A23.9 23.9 0 0 0 0 24c0 3.88.93 7.56 2.6 10.92l8.05-6.26z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.2 0 11.43-2.04 15.24-5.54l-7.38-5.73C29.7 38.28 26.96 39.5 24 39.5c-6.26 0-11.42-4.96-12.75-11.54l-8.05 6.26C6.5 42.1 14.6 48 24 48z"
                />
              </svg>
              Sign in with Google
            </Button>
          </form>

          {/* Forgot Password & Register Links */}
          <div className="space-y-3 text-center">
            {!isRegister && (
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Forgot password?
              </button>
            )}

            <div className="text-sm text-gray-600">
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                {isRegister ? "Sign in" : "Register"}
              </button>
            </div>
          </div>

          {/* Contact Support Section */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
            <div className="text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <Snowflake className="h-4 w-4 text-blue-500" />
                Need help? Contact us
              </p>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <a
                  href="mailto:contacttobepartner@gmail.com"
                  className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  contacttobepartner@gmail.com
                </a>

                <a
                  href="tel:+998330037701"
                  className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  +998 33 003 77 01
                </a>

                <a
                  href="https://t.me/taskysupportbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 hover:text-blue-600 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  @taskysupportbot (Telegram)
                </a>
              </div>

              <p className="text-xs text-gray-500 px-4 leading-relaxed">
                Messages go to our support inbox; Telegram bot will reply and log requests for faster follow-up.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
