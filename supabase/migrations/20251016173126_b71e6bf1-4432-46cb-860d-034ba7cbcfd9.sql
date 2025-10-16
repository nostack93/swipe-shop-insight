-- Create saved_items table for "save for later" functionality
CREATE TABLE public.saved_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved items"
ON public.saved_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to saved items"
ON public.saved_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from saved items"
ON public.saved_items
FOR DELETE
USING (auth.uid() = user_id);