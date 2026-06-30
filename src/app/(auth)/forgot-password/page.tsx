"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, KeyRound, Info } from "lucide-react";

export default function ForgotPasswordPage() {
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
            Reset Password
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-muted/50 border border-border/50 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Contact the Logistics Officer (S-4)</p>
              <p className="text-sm text-muted-foreground">
                Password resets can only be done by the <strong>Logistics Officer (S-4)</strong>. 
                Please contact them directly to have your password reset to your Student ID number.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left w-full">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Your default password is your <strong>Student ID number</strong>. 
                If you changed it and forgot it, the Logistics Officer can reset it for you.
              </p>
            </div>
          </div>

          <Link href="/login" className="block">
            <Button variant="outline" className="w-full h-11">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </CardContent>

        <CardFooter className="justify-center pb-6">
          <p className="text-xs text-muted-foreground text-center">
            Authorized personnel only. All access is monitored and logged.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
