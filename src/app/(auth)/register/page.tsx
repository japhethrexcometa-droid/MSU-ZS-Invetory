"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    role: "student_cadet" as UserRole,
    student_number: "",
    officer_id: "",
    contact_number: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const isOfficer = !["student_cadet"].includes(formData.role);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            student_number: formData.student_number || undefined,
            officer_id: formData.officer_id || undefined,
            contact_number: formData.contact_number || undefined,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Account created! Please check your email to verify.", {
          duration: 5000,
        });
        router.push("/login");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-lg relative backdrop-blur-sm bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl military-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Register for the MSU-ZS ROTC Inventory System
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="Juan"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Dela Cruz"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">University Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@msuzs-rotc.edu.ph"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => { if (typeof value === "string") handleChange("role", value); }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isOfficer ? (
              <div className="space-y-2">
                <Label htmlFor="officer_id">Officer ID</Label>
                <Input
                  id="officer_id"
                  placeholder="e.g., OFF-2024-001"
                  value={formData.officer_id}
                  onChange={(e) => handleChange("officer_id", e.target.value)}
                  className="h-11"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="student_number">Student Number</Label>
                <Input
                  id="student_number"
                  placeholder="e.g., 2024-00001"
                  value={formData.student_number}
                  onChange={(e) => handleChange("student_number", e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number (Optional)</Label>
              <Input
                id="contact_number"
                placeholder="09XX-XXX-XXXX"
                value={formData.contact_number}
                onChange={(e) => handleChange("contact_number", e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  className="h-11"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </span>
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col pt-2 pb-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Already have an account? Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
