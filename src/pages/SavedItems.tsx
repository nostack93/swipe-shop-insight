import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

interface SavedItem {
  id: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
  };
}

const SavedItems = () => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      fetchSavedItems();
    }
  }, [session]);

  const fetchSavedItems = async () => {
    const { data, error } = await supabase
      .from("saved_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading saved items", variant: "destructive" });
      return;
    }
    
    // Fetch products for saved items
    if (data && data.length > 0) {
      const productIds = data.map(item => item.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);
      
      const itemsWithProducts = data.map(item => ({
        id: item.id,
        product: products?.find(p => p.id === item.product_id) || {
          id: item.product_id,
          name: "Unknown",
          description: "",
          price: 0,
          image_url: ""
        }
      }));
      
      setSavedItems(itemsWithProducts);
    } else {
      setSavedItems([]);
    }
  };

  const handleRemove = async (savedItemId: string) => {
    const { error } = await supabase
      .from("saved_items")
      .delete()
      .eq("id", savedItemId);

    if (error) {
      toast({ title: "Error removing item", variant: "destructive" });
    } else {
      toast({ title: "Item removed" });
      fetchSavedItems();
    }
  };

  const handleMoveToCart = async (productId: string, savedItemId: string) => {
    if (!session) return;

    const { error } = await supabase.from("cart_items").upsert({
      user_id: session.user.id,
      product_id: productId,
      quantity: 1,
    });

    if (error) {
      toast({ title: "Error adding to cart", variant: "destructive" });
    } else {
      await handleRemove(savedItemId);
      toast({ title: "Moved to cart! 🛒" });
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/swipe")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Saved Items
        </h1>
        <div className="w-10" />
      </nav>

      <div className="container max-w-4xl mx-auto p-4">
        {savedItems.length === 0 ? (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold mb-4">No saved items yet</h2>
            <p className="text-muted-foreground mb-8">Swipe left to save items for later</p>
            <Button onClick={() => navigate("/swipe")} className="bg-gradient-primary">
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedItems.map((item) => (
              <Card key={item.id} className="overflow-hidden bg-card/50 backdrop-blur-xl border-white/10">
                <CardHeader className="p-0">
                  <img
                    src={item.product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                    alt={item.product.name}
                    className="w-full h-48 object-cover"
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2">{item.product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-2">{item.product.description}</p>
                  <p className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    ${item.product.price}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    onClick={() => handleMoveToCart(item.product.id, item.id)}
                    className="flex-1 bg-gradient-primary"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    onClick={() => handleRemove(item.id)}
                    variant="outline"
                    size="icon"
                    className="border-white/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedItems;
