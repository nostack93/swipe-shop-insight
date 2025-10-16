import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogOut, Package, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

const Swipe = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [swipedProducts, setSwipedProducts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (session.user) {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    setUserRole(data?.role || null);
  };

  useEffect(() => {
    if (session) {
      fetchProducts();
    }
  }, [session]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading products", variant: "destructive" });
      return;
    }
    setProducts(data || []);
  };

  const handleSwipe = async (productId: string, direction: "left" | "right") => {
    if (!session) return;

    // Mark as swiped
    setSwipedProducts(prev => new Set(prev).add(productId));
    
    await supabase.from("swipe_interactions").insert({
      user_id: session.user.id,
      product_id: productId,
      action: direction,
    });

    if (direction === "right") {
      const { error } = await supabase.from("cart_items").upsert({
        user_id: session.user.id,
        product_id: productId,
        quantity: 1,
      });

      if (error) {
        toast({ title: "Error adding to cart", variant: "destructive" });
      } else {
        toast({ title: "Added to cart! 🛒" });
      }
    } else {
      // Left swipe saves for later
      const { error } = await supabase.from("saved_items").upsert({
        user_id: session.user.id,
        product_id: productId,
      });

      if (error) {
        toast({ title: "Error saving item", variant: "destructive" });
      } else {
        toast({ title: "Saved for later 💜" });
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const visibleProducts = products.filter(p => !swipedProducts.has(p.id));
      if (visibleProducts.length === 0) return;

      const firstProduct = visibleProducts[0];
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSwipe(firstProduct.id, "left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSwipe(firstProduct.id, "right");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [products, swipedProducts, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session) return null;

  const visibleProducts = products.filter(p => !swipedProducts.has(p.id));

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-white/10">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          SwipeShop
        </h1>
        <div className="flex gap-2">
          {userRole === "seller" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/seller")}
              className="border-white/10"
            >
              <Package className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/saved")}
            className="border-white/10"
          >
            <Heart className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/cart")}
            className="border-white/10"
          >
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="border-white/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <div className="container max-w-md mx-auto p-4 pb-20">
        {visibleProducts.length > 0 ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              💡 Swipe right to add to cart, left to save for later. Use ← → arrow keys!
            </p>
            {visibleProducts.map((product) => (
              <div key={product.id} className="animate-fade-in">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  description={product.description || ""}
                  price={product.price}
                  imageUrl={product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                  onSwipe={handleSwipe}
                />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold mb-4">You've seen everything! 🎉</h2>
            <p className="text-muted-foreground mb-8">Check your cart or saved items</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/saved")} variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                Saved Items
              </Button>
              <Button onClick={() => navigate("/cart")} className="bg-gradient-primary">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Cart
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold mb-4">No products yet!</h2>
            <p className="text-muted-foreground mb-8">Check back later for new items</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swipe;
