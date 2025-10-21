import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string;
  };
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) fetchCart();
  }, [session]);

  const fetchCart = async () => {
    const { data, error } = await supabase
      .from("cart_items")
      .select(`
        id,
        quantity,
        products (id, name, price, image_url)
      `)
      .eq("user_id", session?.user.id);

    if (!error && data) {
      setCartItems(data as any);
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    
    if (error) {
      toast({ title: "Error removing item", variant: "destructive" });
    } else {
      toast({ title: "Removed from cart" });
      fetchCart();
    }
  };

  const total = cartItems.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);

  const checkout = async () => {
    if (!session || cartItems.length === 0) return;
    try {
      // Record purchase interactions per item individually; continue on partial failures
      for (const item of cartItems) {
        const { error } = await supabase.from("swipe_interactions").insert({
          user_id: session.user.id,
          product_id: item.products.id,
          action: "purchased",
        });
        if (error) console.warn("purchase insert failed", error.message);
      }

      // Clear cart regardless of insert results
      const { error: clearError } = await supabase.from("cart_items").delete().eq("user_id", session.user.id);
      if (clearError) console.warn("clear cart failed", clearError.message);

      toast({ title: "Checkout complete! 🎉" });
      setCartItems([]);
      navigate("/swipe");
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-xl border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
      </nav>

      <div className="container max-w-2xl mx-auto p-4">
        {cartItems.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/")} className="bg-gradient-primary">
              Start Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4 bg-gradient-card backdrop-blur-xl border-white/10">
                  <div className="flex gap-4">
                    <img
                      src={item.products.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                      alt={item.products.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.products.name}</h3>
                      <p className="text-muted-foreground">Quantity: {item.quantity}</p>
                      <p className="font-bold mt-1">${item.products.price.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-gradient-card backdrop-blur-xl border-white/10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold">Total</span>
                <span className="text-2xl font-bold">${total.toFixed(2)}</span>
              </div>
              <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={checkout}>
                Checkout
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
