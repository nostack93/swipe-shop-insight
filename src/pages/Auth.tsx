import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingBag } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "seller">("user");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const fillDemoSeller = () => {
    setEmail("no@gmail.com");
    setPassword("12345678");
    setIsLogin(true);
  };
  const fillDemoUser = () => {
    setEmail("no1@gmail.com");
    setPassword("12345678");
    setIsLogin(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        let { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error && error.message?.toLowerCase().includes("invalid")) {
          // Auto-create demo user if it doesn't exist yet
          const signup = await supabase.auth.signUp({ email, password });
          if (signup.error) throw signup.error;
          ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
        }
        if (error) throw error;

        // Ensure profile exists with default role and $1000 balance in metadata
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email,
          role: email === "no@gmail.com" ? "seller" : "user",
        });

        // Store a fake balance in localStorage (client-side only demo)
        const balanceKey = `balance:${data.user.id}`;
        if (!localStorage.getItem(balanceKey)) {
          localStorage.setItem(balanceKey, JSON.stringify({ amount: 1000 }));
        }

        // Demo seller shortcut
        if (email === "no@gmail.com") {
          toast({ title: "Welcome back!" });
          navigate("/seller");
        } else {
          // Get user role and navigate accordingly
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
          toast({ title: "Welcome back!" });
          navigate(profile?.role === "seller" ? "/seller" : "/swipe");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email,
            role,
          });
          const balanceKey = `balance:${data.user.id}`;
          if (!localStorage.getItem(balanceKey)) {
            localStorage.setItem(balanceKey, JSON.stringify({ amount: 1000 }));
          }
        }
        toast({ title: "Account created successfully!" });
        navigate(role === "seller" ? "/seller" : "/swipe");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md p-8 bg-gradient-card backdrop-blur-xl border-white/10">
        <div className="flex items-center justify-center mb-8">
          <div className="p-4 bg-gradient-primary rounded-2xl">
            <ShoppingBag className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-primary bg-clip-text text-transparent">
          SwipeShop
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Swipe right to shop, left to skip
        </p>

        <Tabs value={isLogin ? "login" : "signup"} onValueChange={(v) => setIsLogin(v === "login")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label>I am a</Label>
                <RadioGroup value={role} onValueChange={(v) => setRole(v as "user" | "seller")} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="user" />
                    <Label htmlFor="user" className="cursor-pointer">Shopper</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seller" id="seller" />
                    <Label htmlFor="seller" className="cursor-pointer">Seller</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/10"
              onClick={fillDemoSeller}
            >
              Use demo seller (no@gmail.com / 12345678)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/10"
              onClick={fillDemoUser}
            >
              Use demo user (no1@gmail.com / 12345678)
            </Button>
          </form>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
