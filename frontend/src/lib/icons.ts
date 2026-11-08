import { Ionicons } from '@expo/vector-icons';
import type { IconName } from '@/types';

/** iOS convention: selected tabs use the filled glyph, the rest use the outline. "home" -> "home-outline". */
export function outlineIcon(name: IconName): IconName {
  if (name.endsWith('-outline')) return name;
  const outline = `${name}-outline`;
  return outline in Ionicons.glyphMap ? (outline as IconName) : name;
}
