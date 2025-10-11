import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogOut, Package } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  const handleSwipe = async (direction: "left" | "right") => {
    if (!session) return;

    const currentProduct = products[currentIndex];
    
    await supabase.from("swipe_interactions").insert({
      user_id: session.user.id,
      product_id: currentProduct.id,
      action: direction,
    });

    if (direction === "right") {
      const { error } = await supabase.from("cart_items").upsert({
        user_id: session.user.id,
        product_id: currentProduct.id,
        quantity: 1,
      });

      if (error) {
        toast({ title: "Error adding to cart", variant: "destructive" });
      } else {
        toast({ title: "Added to cart! 🛒" });
      }
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-white/10">
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

      <div className="container max-w-md mx-auto p-4 pt-8">
        {currentIndex < products.length ? (
          <div className="relative h-[600px]">
            {products.slice(currentIndex, currentIndex + 2).map((product, index) => (
              <div
                key={product.id}
                style={{ zIndex: 2 - index }}
                className={index === 1 ? "scale-95 opacity-50" : ""}
              >
                {index === 0 && (
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    description={product.description || ""}
                    price={product.price}
                    imageUrl={product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                    onSwipe={handleSwipe}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold mb-4">No more products!</h2>
            <p className="text-muted-foreground mb-8">Check back later for new items</p>
            <Button onClick={() => navigate("/cart")} className="bg-gradient-primary">
              View Cart
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Swipe;
