import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/public/EmpireCharme.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — EmpireCharme" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Sign in
  const [siIdentifier, setSiIdentifier] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [showSiPassword, setShowSiPassword] = useState(false);

  // Sign up
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suName, setSuName] = useState("");
  const [showSuPassword, setShowSuPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);

      const isAdmin = roles?.some((r) => r.role === "admin");
      const isStaff = roles?.some((r) => r.role === "staff" || r.role === "stylist");

      navigate({
        to: isAdmin ? "/admin" : isStaff ? "/staff" : "/app",
      });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let email = siIdentifier.trim();

    if (!email.includes("@")) {
      email = email.replace(/\s+/g, "");
    }

    // If user entered phone number, resolve via edge function (RLS-safe)
    if (!email.includes("@")) {
      const { data: resolved, error: resolveError } = await supabase.functions.invoke(
        "resolve-login",
        { body: { phone: email } },
      );

      if (resolveError) {
        setLoading(false);
        toast.error(resolveError.message);
        return;
      }

      if (!resolved?.email) {
        setLoading(false);
        toast.error("Phone number not found");
        return;
      }

      email = resolved.email as string;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: siPassword,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    const isStaff = roles?.some((r) => r.role === "staff" || r.role === "stylist");

    navigate({
      to: isAdmin ? "/admin" : isStaff ? "/staff" : "/home",
    });
  };
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: {
          phone: suPhone.trim() || null,
          name: suName.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created successfully!");

    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={logo} alt="EmpireCharme" className="h-16 w-auto mx-auto" />
          </div>

          <h1 className="text-2xl font-serif leading-none tracking-tight">
            Welcome to Empire Charme
          </h1>


          <CardDescription>Sign in or create your salon account</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>

              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            {/* SIGN IN */}
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label htmlFor="si-identifier">Email or Phone</Label>

                  <Input
                    id="si-identifier"
                    required
                    placeholder="Enter email or phone number"
                    value={siIdentifier}
                    onChange={(e) => setSiIdentifier(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="si-password">Password</Label>

                  <div className="relative">
                    <Input
                      id="si-password"
                      type={showSiPassword ? "text" : "password"}
                      required
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      className="pr-10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowSiPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showSiPassword ? "Hide password" : "Show password"}
                    >
                      {showSiPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            {/* SIGN UP */}
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Name</Label>

                  <Input
                    id="su-name"
                    required
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>

                  <Input
                    id="su-email"
                    type="email"
                    required
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="su-phone">Phone</Label>

                  <Input
                    id="su-phone"
                    type="tel"
                    value={suPhone}
                    onChange={(e) => setSuPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>

                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showSuPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      className="pr-10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowSuPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showSuPassword ? "Hide password" : "Show password"}
                    >
                      {showSuPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
