import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  onSwipe: (id: string, direction: "left" | "right") => void;
}

export const ProductCard = ({ id, name, description, price, imageUrl, onSwipe }: ProductCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      const direction = info.offset.x > 0 ? "right" : "left";
      onSwipe(id, direction);
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      className="w-full cursor-grab active:cursor-grabbing"
      data-product-card="true"
    >
      <Card className="relative h-[calc(100vh-200px)] bg-gradient-card backdrop-blur-xl border-white/10 overflow-hidden shadow-card touch-pan-y" style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}>
        <div className="absolute inset-0">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="absolute top-4 left-0 right-0 flex justify-between px-4 pointer-events-none">
          <motion.div
            className="bg-destructive/90 backdrop-blur-sm p-4 rounded-full"
            style={{ opacity: useTransform(x, [-200, -50, 0], [1, 0, 0]) }}
          >
            <X className="h-8 w-8" />
          </motion.div>
          <motion.div
            className="bg-green-500/90 backdrop-blur-sm p-4 rounded-full"
            style={{ opacity: useTransform(x, [0, 50, 200], [0, 0, 1]) }}
          >
            <Heart className="h-8 w-8 fill-white" />
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{name}</h2>
          <p className="text-base sm:text-lg text-white/80 line-clamp-2">{description}</p>
          <p className="text-xl sm:text-2xl font-bold text-white">${price.toFixed(2)}</p>
        </div>
      </Card>
    </motion.div>
  );
};
