import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, TrendingUp, Eye, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface Analytics {
  totalViews: number;
  totalSwipesRight: number;
  totalSwipesLeft: number;
}

const Seller = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalViews: 0,
    totalSwipesRight: 0,
    totalSwipesLeft: 0,
  });
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
  });
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
    if (session) {
      fetchProducts();
      fetchAnalytics();
    }
  }, [session]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", session?.user.id);
    setProducts(data || []);
  };

  const fetchAnalytics = async () => {
    const { data } = await supabase
      .from("swipe_interactions")
      .select("action, products!inner(seller_id)")
      .eq("products.seller_id", session?.user.id);

    if (data) {
      const analytics = {
        totalViews: data.length,
        totalSwipesRight: data.filter((s) => s.action === "right").length,
        totalSwipesLeft: data.filter((s) => s.action === "left").length,
      };
      setAnalytics(analytics);
    }
  };

  const handleAddProduct = async () => {
    if (!session) return;

    const { error } = await supabase.from("products").insert({
      seller_id: session.user.id,
      name: newProduct.name,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      image_url: newProduct.image_url,
      category: newProduct.category,
    });

    if (error) {
      toast({ title: "Error adding product", variant: "destructive" });
    } else {
      toast({ title: "Product added successfully!" });
      setNewProduct({ name: "", description: "", price: "", image_url: "", category: "" });
      fetchProducts();
    }
  };

  const conversionRate = analytics.totalViews > 0
    ? ((analytics.totalSwipesRight / analytics.totalViews) * 100).toFixed(1)
    : "0";

  const chartData = [
    { name: "Added to Cart", value: analytics.totalSwipesRight, color: "#10b981" },
    { name: "Saved for Later", value: analytics.totalSwipesLeft, color: "#a855f7" },
    { name: "Skipped", value: Math.max(0, analytics.totalViews - analytics.totalSwipesRight - analytics.totalSwipesLeft), color: "#6b7280" },
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-xl border-b border-white/10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
      </nav>

      <div className="container max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-3xl font-bold">{analytics.totalViews}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Heart className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Swipes Right</p>
                <p className="text-3xl font-bold">{analytics.totalSwipesRight}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-white/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-3xl font-bold">{conversionRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {analytics.totalViews > 0 && (
          <Card className="p-6 bg-gradient-card backdrop-blur-xl border-white/10 mb-8">
            <h2 className="text-xl font-bold mb-4">User Engagement Analytics</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground">Added to Cart</p>
                <p className="text-2xl font-bold text-green-500">{analytics.totalSwipesRight}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saved for Later</p>
                <p className="text-2xl font-bold text-purple-500">{analytics.totalSwipesLeft}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-gray-500">
                  {Math.max(0, analytics.totalViews - analytics.totalSwipesRight - analytics.totalSwipesLeft)}
                </p>
              </div>
            </div>
          </Card>
        )}


        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Products</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-5 w-5 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <Button onClick={handleAddProduct} className="w-full bg-gradient-primary">
                  Add Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden bg-gradient-card backdrop-blur-xl border-white/10">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                <p className="text-xl font-bold">${product.price.toFixed(2)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Seller;
