import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminSignIn } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SPINTIFY_LOGO, BRAND } from "@/lib/brand";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/modules" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId.trim()) {
      toast.error("Company ID is required");
      return;
    }
    setLoading(true);
    try {
      let tokens;
      try {
        tokens = await adminSignIn({ data: { userId, password } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sign-in failed");
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Signed in");
      navigate({ to: "/modules" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-100">
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-2xl shadow-blue-200/40 space-y-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={SPINTIFY_LOGO} alt="Spintify" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{BRAND.name}</h1>
            <p className="text-xs text-muted-foreground">Secure enterprise access</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyId">Company ID</Label>
          <Input
            id="companyId"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Enter Company ID"
            autoComplete="organization"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="userid">Username</Label>
          <Input
            id="userid"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter Username or Email"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Please contact your Spintify administrator to reset the password for your Company ID. For
              security, password resets are handled offline.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setForgotOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
