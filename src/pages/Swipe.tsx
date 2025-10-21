import { useEffect, useState, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    // Show ALL products again (revert to global feed)
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading products", description: error.message, variant: "destructive" });
      return;
    }
    // Filter out specific products and dedupe by product name to avoid duplicates
    const removedNames = ["yes", "hr", "slim jean", "ripped jeans", "knit sweater", "trechn coart", "classic white shirt", "wireless headphones"].map(n => n.toLowerCase());
    const filtered = (data || []).filter((p) => {
      const name = (p.name || "").trim().toLowerCase();
      return !removedNames.includes(name);
    });
    const seen = new Set<string>();
    const deduped = filtered.filter((p) => {
      const key = (p.name || "").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setProducts(deduped);
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
      // Ensure one cart entry per user/product without relying on DB unique constraint
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", productId)
        .limit(1);
      let error = null;
      if (!existing || existing.length === 0) {
        const res = await supabase.from("cart_items").insert({
          user_id: session.user.id,
          product_id: productId,
          quantity: 1,
        });
        error = res.error;
      }

      if (error) {
        toast({ title: "Error adding to cart", variant: "destructive" });
      } else {
        toast({ title: "Added to cart! 🛒" });
      }
    } else {
      // Left swipe saves for later; make idempotent without unique index
      await supabase
        .from("saved_items")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", productId);
      const { error } = await supabase
        .from("saved_items")
        .insert({
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
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        // Snap to the next/previous product card based on container midpoint
        const container = containerRef.current;
        const cards = Array.from(document.querySelectorAll('[data-product-card="true"]')) as HTMLElement[];
        if (container && cards.length > 0) {
          const midpoint = container.scrollTop + container.clientHeight * 0.5;
          // Find the index of the card closest to midpoint
          let activeIndex = 0;
          let minDelta = Number.POSITIVE_INFINITY;
          cards.forEach((el, idx) => {
            const center = el.offsetTop + el.offsetHeight / 2;
            const delta = Math.abs(center - midpoint);
            if (delta < minDelta) { minDelta = delta; activeIndex = idx; }
          });

          const nextIndex = e.key === "ArrowDown"
            ? Math.min(activeIndex + 1, cards.length - 1)
            : Math.max(activeIndex - 1, 0);
          cards[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });
        }
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

      <div
        ref={containerRef}
        className="container max-w-md mx-auto p-4 pb-20"
        style={{
          height: 'calc(100vh - 80px)',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
          scrollPadding: '0',
          paddingBottom: '2rem'
        }}
      >
        {visibleProducts.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground text-center mb-6">
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
