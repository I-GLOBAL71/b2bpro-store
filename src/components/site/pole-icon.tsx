import {
  Target,
  ShoppingCart,
  Bot,
  Building2,
  Megaphone,
  Users,
  CalendarDays,
  HeartHandshake,
  UtensilsCrossed,
  Briefcase,
  Cpu,
  TrendingUp,
  GraduationCap,
  Truck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  target: Target,
  "shopping-cart": ShoppingCart,
  bot: Bot,
  "building-2": Building2,
  megaphone: Megaphone,
  users: Users,
  "calendar-days": CalendarDays,
  "heart-handshake": HeartHandshake,
  "utensils-crossed": UtensilsCrossed,
  briefcase: Briefcase,
  cpu: Cpu,
  "trending-up": TrendingUp,
  "graduation-cap": GraduationCap,
  truck: Truck,
};

export function PoleIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = MAP[icon] || Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
