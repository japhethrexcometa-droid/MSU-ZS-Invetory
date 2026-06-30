"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, LogIn, Info } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !password) {
      toast.error("Please enter your Student ID and password");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Look up the email by Student ID (server-side, bypasses RLS)
      const lookupRes = await fetch("/api/auth/lookup-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_number: studentId.trim() }),
      });

      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.email) {
        toast.error("Account not found. Please check your Student ID or contact the Logistics Officer (S-4).");
        return;
      }

      // Step 2: Sign in with the actual email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: lookupData.email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Step 3: Check profile (server-side, bypasses RLS)
        const profileRes = await fetch("/api/auth/lookup-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: data.user.id }),
        });

        const profile = await profileRes.json();

        if (!profileRes.ok) {
          await supabase.auth.signOut();
          toast.error("Account not found. Please check your Student ID or contact the Logistics Officer (S-4).");
          return;
        }

        if (!profile.is_approved) {
          await supabase.auth.signOut();
          toast.error(
            "Account pending approval. Please wait for the Logistics Officer (S-4) to approve your account.",
            { duration: 6000 }
          );
          return;
        }

        toast.success(`Welcome, ${profile.first_name}!`);
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      
      if (message.includes("Invalid login credentials")) {
        toast.error("Invalid Student ID or password. Check your credentials or contact the Logistics Officer (S-4).");
      } else if (message.includes("Email not confirmed")) {
        toast.error("Account not yet activated. Please contact support to activate your account.");
      } else {
        toast.error(message);
      }
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

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl military-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            ROTC Inventory System
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Mindanao State University - Zamboanga
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID Number</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="2024-00001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="h-11 font-mono"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Login with your Student ID number. Having trouble? Contact the <strong>Logistics Officer (S-4)</strong>.
              </p>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">New here?</span>
            </div>
          </div>
          <Link href="/register" className="w-full">
            <Button variant="outline" className="w-full h-11">
              Create ROTC Officer Account
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Authorized personnel only. All access is monitored and logged.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
