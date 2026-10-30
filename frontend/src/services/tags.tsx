import { Compass, Landmark, Mountain, TreePine, Utensils, Waves, Tent, Heart, Users, Sparkles, Snowflake, Sun, Droplets, Map as MapIcon, Flower2 } from "lucide-react";
import type { ComponentType } from "react";

export const TAG_META: Record<string, { label: string; icon: ComponentType<{ size?: number }> }> = {
  temple: { label: "Temples and pilgrimage", icon: Landmark }, wildlife: { label: "Forests and wildlife", icon: TreePine },
  beach: { label: "Beaches", icon: Waves }, hills: { label: "Hill stations", icon: Mountain },
  heritage: { label: "Historical monuments", icon: Landmark }, waterfall: { label: "Waterfalls", icon: Droplets },
  lake: { label: "Lakes and wetlands", icon: Droplets }, river: { label: "Rivers and rafting", icon: Waves },
  desert: { label: "Deserts", icon: Sun }, fort: { label: "Forts and palaces", icon: Landmark },
  cave: { label: "Caves", icon: Mountain }, island: { label: "Islands", icon: Waves }, adventure: { label: "Adventure", icon: Tent },
  trekking: { label: "Trekking", icon: Mountain }, food: { label: "Food tourism", icon: Utensils },
  wellness: { label: "Wellness and yoga", icon: Flower2 }, culture: { label: "Culture and festivals", icon: Sparkles },
  city: { label: "Cities and museums", icon: MapIcon }, offbeat: { label: "Hidden gems", icon: Compass },
  backwaters: { label: "Backwaters", icon: Waves }, snow: { label: "Snow and skiing", icon: Snowflake },
  honeymoon: { label: "Romantic", icon: Heart }, family: { label: "Family friendly", icon: Users },
  weekend: { label: "Weekend getaways", icon: Compass }, budget: { label: "Budget friendly", icon: Compass },
};
export const tagLabel = (t: string) => TAG_META[t]?.label ?? t;
export const CATEGORY_TILES = ["temple", "wildlife", "beach", "hills", "heritage", "waterfall", "adventure", "food", "wellness", "offbeat"];

/** Link to a destination page; falls back to the planner for records that lack slugs. */
export const placeLink = (d: { id: string; slug?: string; state_slug?: string }) =>
  d.slug && d.state_slug ? `/destinations/${d.state_slug}/${d.slug}` : `/plan?destination=${d.id}`;
