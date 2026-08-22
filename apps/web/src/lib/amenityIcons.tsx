import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Anchor,
  Armchair,
  Archive,
  Baby,
  Bath,
  BedDouble,
  Bell,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Cable,
  CalendarRange,
  Car,
  ChefHat,
  CircleDot,
  CircleHelp,
  CircleParking,
  Coffee,
  CookingPot,
  Cross,
  CupSoda,
  DoorOpen,
  Droplet,
  Droplets,
  Dumbbell,
  Fan,
  Flame,
  FlameKindling,
  FlaskConical,
  Footprints,
  Gamepad2,
  Gift,
  GlassWater,
  Grid2x2,
  HandMetal,
  HardHat,
  Heater,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  Leaf,
  Luggage,
  MapPin,
  Microwave,
  Monitor,
  Mountain,
  Music2,
  Package,
  ParkingCircle,
  Piano,
  Plug,
  Refrigerator,
  Router,
  Rows3,
  Sailboat,
  ScanLine,
  Shield,
  ShieldCheck,
  Shirt,
  ShowerHead,
  Snowflake,
  Sofa,
  Sparkles,
  Square,
  Sun,
  Table,
  Table2,
  Tent,
  Thermometer,
  Trash2,
  TreePine,
  Tv,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  Vault,
  Volume2,
  Waves,
  Wifi,
  Wind,
  Wine,
  Zap,
  Fence,
  Home,
  ArrowUpDown,
  SprayCan,
  Bed,
  Palette,
  Globe,
  Wallet,
  Timer,
} from 'lucide-react';
import { canonicalizeAmenity } from '@/lib/propertyAmenityCatalog';

/** One distinct Lucide vector per catalog amenity label. */
export const AMENITY_ICON_MAP: Record<string, LucideIcon> = {
  // Basics
  Essentials: Package,
  'Toilet paper': ScanLine,
  'Body soap': Droplet,
  Hangers: Shirt,
  'Extra pillows and blankets': BedDouble,
  Safe: Vault,
  'Luggage dropoff allowed': Luggage,
  'Long term stays allowed': CalendarRange,
  'Cleaning before checkout': Sparkles,
  'Breakfast provided': Coffee,
  'Self check-in': KeyRound,
  'Pets allowed': Footprints,

  // Bathroom
  Bathtub: Bath,
  Bidet: ShowerHead,
  'Cleaning products': SprayCan,
  Conditioner: FlaskConical,
  'Hair dryer': Wind,
  'Hot water': Thermometer,
  'Outdoor shower': Umbrella,
  Shampoo: Droplets,
  'Shower gel': GlassWater,

  // Bedroom and laundry
  'Bed linens': Bed,
  'Clothing storage': Archive,
  Dryer: Timer,
  'Drying rack for clothes': Rows3,
  Iron: HandMetal,
  'Mosquito net': Tent,
  'Room-darkening shades': Layers,
  Washer: Shirt,

  // Entertainment
  'Books and reading material': BookOpen,
  'Ethernet connection': Cable,
  'Exercise equipment': Dumbbell,
  'Game console': Gamepad2,
  Piano: Piano,
  'Ping pong table': CircleDot,
  'Pool table': Grid2x2,
  'Record player': Music2,
  'Sound system': Volume2,
  TV: Tv,

  // Family
  'Baby bath': Bath,
  'Baby monitor': Monitor,
  'Baby safety gates': Fence,
  'Babysitter recommendations': CircleHelp,
  'Board games': Palette,
  'Changing table': Table2,
  "Children's books and toys": Gift,
  "Children's dinnerware": Utensils,
  Crib: Baby,
  'Fireplace guards': HardHat,
  'High chair': Armchair,
  'Outlet covers': Plug,
  "Pack 'n Play/Travel crib": Bed,
  'Table corner guards': Square,
  'Window guards': Shield,

  // Heating and cooling
  'Air conditioning': Snowflake,
  'Ceiling fan': Fan,
  Heating: Heater,
  'Indoor fireplace': Flame,
  'Indoor fireplace: electric': Zap,
  'Portable fans': Wind,

  // Home safety
  'Carbon monoxide alarm': AlertTriangle,
  'Fire extinguisher': FlameKindling,
  'First aid kit': Cross,
  'Smoke alarm': Bell,

  // Internet and office
  'Dedicated workspace': Briefcase,
  'Pocket WiFi': Router,
  WiFi: Wifi,

  // Kitchen and dining
  Kitchen: UtensilsCrossed,
  'Baking sheet': Layers,
  'Barbecue utensils': Utensils,
  Blender: CupSoda,
  'Bowls, chopsticks, plates, cups, etc.': UtensilsCrossed,
  'Bread maker': ChefHat,
  Coffee: Coffee,
  'Coffee maker': CupSoda,
  'Dining table': Table,
  Dishwasher: Waves,
  Freezer: Snowflake,
  'Hot water kettle': CookingPot,
  Microwave: Microwave,
  'Mini fridge': Refrigerator,
  Oven: FlameKindling,
  'Pots and pans, oil, salt and pepper': CookingPot,
  Refrigerator: Refrigerator,
  'Rice maker': CookingPot,
  Stove: Flame,
  Toaster: Zap,
  'Trash compactor': Trash2,
  'Wine glasses': Wine,

  // Location features
  Waterfront: Waves,
  'Beach access': Sun,
  'Lake access': Sailboat,
  'Ski-in/ski-out': Mountain,
  'Private entrance': DoorOpen,
  'Laundromat nearby': MapPin,
  'Resort access': Landmark,
  'Mountain view': Globe,

  // Outdoor
  'Patio or balcony': Building2,
  Backyard: TreePine,
  'Fire pit': FlameKindling,
  'Outdoor furniture': Sofa,
  Hammock: Leaf,
  'Outdoor dining area': Table2,
  'Outdoor kitchen': UtensilsCrossed,
  'BBQ grill': Flame,
  'Beach essentials': Umbrella,
  Bikes: Bike,
  Kayak: Anchor,
  'Boat slip': Sailboat,

  // Parking and facilities
  'Free parking on premises': Car,
  'Free street parking': CircleParking,
  Pool: Droplets,
  'Hot tub': Waves,
  Sauna: Thermometer,
  Elevator: ArrowUpDown,
  'EV charger': Zap,
  Gym: Dumbbell,
  'Paid parking off premises': ParkingCircle,
  'Paid parking on premises': Wallet,
  'Single level home': Home,

  // Legacy / filter chip labels
  Parking: Car,
  Balcony: Building2,
  'Air Conditioning': Snowflake,
  'Hot Tub': Waves,
  'Washer/Dryer': Shirt,
  Workspace: Laptop,
  Fireplace: Flame,
  'Pet Friendly': Footprints,
  Garden: TreePine,
  BBQ: Flame,
  'Beach Access': Sun,
};

/** Resolve icon for any amenity label (catalog, legacy, or scraped). */
export function getAmenityIcon(label: string): LucideIcon {
  const trimmed = label.trim();
  if (AMENITY_ICON_MAP[trimmed]) return AMENITY_ICON_MAP[trimmed];

  const canonical = canonicalizeAmenity(trimmed);
  if (canonical && AMENITY_ICON_MAP[canonical]) return AMENITY_ICON_MAP[canonical];

  return CircleHelp;
}

type AmenityIconProps = {
  label: string;
  size?: number;
  className?: string;
};

/** Render the vector icon for an amenity label. */
export function AmenityIcon({ label, size = 18, className = '' }: AmenityIconProps) {
  const Icon = getAmenityIcon(label);
  return <Icon size={size} className={className} aria-hidden />;
}
