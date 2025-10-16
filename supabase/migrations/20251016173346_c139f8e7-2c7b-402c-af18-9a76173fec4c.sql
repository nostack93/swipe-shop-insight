-- Add foreign key relationship for saved_items to products
ALTER TABLE public.saved_items
ADD CONSTRAINT saved_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;