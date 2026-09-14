/**
 * A distinct glyph per category family.
 *
 * Eight identical icons read as unfinished, and on a phone the glyph is what
 * people scan before the label. Unmapped categories fall back to the kolam
 * rosette rather than inventing a wrong picture.
 */
import { IconKolam } from "./Icons";

const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" as const,
  stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Podis — a mound of ground spice in a mortar. */
const Podi = () => (
  <svg {...base}>
    <path d="M4.6 13.5h14.8a7.4 7.4 0 0 1-14.8 0Z" />
    <path d="M8.4 13.5c1-2.6 2-4 3.6-4s2.6 1.4 3.6 4" />
    <path d="M7 20.6h10" />
  </svg>
);

/** Pickles & thokkus — a jar with a cloth lid. */
const Jar = () => (
  <svg {...base}>
    <path d="M7.4 8.6h9.2v10.2a1.6 1.6 0 0 1-1.6 1.6H9a1.6 1.6 0 0 1-1.6-1.6Z" />
    <path d="M6.6 5.6h10.8v3H6.6z" />
    <path d="M9.8 12.2h4.4M9.8 15.4h4.4" />
  </svg>
);

/** Savouries — a coiled murukku. */
const Spiral = () => (
  <svg {...base}>
    <path d="M12 12a2 2 0 1 1 2 2 3.4 3.4 0 0 1-3.4-3.4 4.8 4.8 0 0 1 4.8-4.8 6.2 6.2 0 0 1 6.2 6.2" />
    <circle cx="12" cy="12" r="8.4" />
  </svg>
);

/** Sweets — a cut diamond of burfi. */
const Sweet = () => (
  <svg {...base}>
    <path d="M12 3.8 20.2 12 12 20.2 3.8 12Z" />
    <path d="M7.9 7.9 16.1 16.1M16.1 7.9 7.9 16.1" />
  </svg>
);

/** Vadam & vathal — drying in the sun. */
const Sun = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
  </svg>
);

/** Appalams — stacked discs. */
const Discs = () => (
  <svg {...base}>
    <ellipse cx="12" cy="7.6" rx="7.6" ry="3" />
    <path d="M4.4 7.6v4c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3v-4" />
    <path d="M4.4 11.6v4c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3v-4" />
  </svg>
);

/** Ghee & oils — a bottle. */
const Bottle = () => (
  <svg {...base}>
    <path d="M10.2 3.4h3.6v3l2.2 2.6v10a1.6 1.6 0 0 1-1.6 1.6H9.6A1.6 1.6 0 0 1 8 19V9l2.2-2.6Z" />
    <path d="M8 13.2h8" />
  </svg>
);

/** Instant mixes & bakery — a packet. */
const Packet = () => (
  <svg {...base}>
    <path d="M6.6 6.4h10.8v13.2H6.6z" />
    <path d="M6.6 6.4 8.4 3.6h7.2l1.8 2.8" />
    <path d="M9.8 11h4.4" />
  </svg>
);

/** Gift packs — a tied box. */
const Gift = () => (
  <svg {...base}>
    <path d="M4 10.2h16v9.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    <path d="M3.2 7h17.6v3.2H3.2zM12 7v13.4" />
    <path d="M12 7S9.8 3.4 8 4.4 9.6 7 12 7Zm0 0s2.2-3.6 4-2.6S14.4 7 12 7Z" />
  </svg>
);

const BY_SLUG: Record<string, () => React.JSX.Element> = {
  podis: Podi,
  "nuts-spices": Podi,
  pickles: Jar,
  thokkus: Jar,
  savouries: Spiral,
  snacks: Spiral,
  sweets: Sweet,
  vadam: Sun,
  vathal: Sun,
  appalams: Discs,
  "ghee-oils": Bottle,
  "instant-mixes": Packet,
  bakery: Packet,
  "gift-packs": Gift,
};

export function CategoryGlyph({ slug }: { slug: string }) {
  const Glyph = BY_SLUG[slug];
  return Glyph ? <Glyph /> : <IconKolam />;
}
