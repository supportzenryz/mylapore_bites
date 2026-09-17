/**
 * One illustration per category.
 *
 * These carry the top of the home page now that the hero is gone, so they are
 * drawn as small two-tone illustrations rather than UI glyphs: teal linework
 * (inherited via currentColor) over a warm amber wash, with an amber accent
 * on the one detail that identifies the thing. Every category in the seed
 * catalogue gets its own drawing — sharing one picture across two categories
 * reads as unfinished at this size and prominence.
 *
 * Drawn at a 32-unit grid and rendered at whatever the tile asks for, so the
 * same file serves the big home-page tiles and the small shop-page filters.
 */

const box = {
  viewBox: "0 0 32 32",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** The warm mass inside a drawing; the amber accent picks out one detail. */
const WASH = "var(--brass-tint)";
const ACCENT = "var(--brass)";

/** Podis — spice ground in a stone mortar, pestle resting in it. */
const Podi = () => (
  <svg {...box}>
    <path d="M5.5 16.5h21a10.5 10.5 0 0 1-21 0Z" fill={WASH} />
    <path d="M10.5 16.5c1.4-3.4 3-5.2 5.5-5.2s4.1 1.8 5.5 5.2" fill={ACCENT} stroke="none" />
    <path d="M10.5 16.5c1.4-3.4 3-5.2 5.5-5.2s4.1 1.8 5.5 5.2" />
    <path d="M22.5 4.5 19 11" />
    <circle cx="23.4" cy="3.6" r="1.8" fill={WASH} />
    <path d="M9.5 28h13" />
  </svg>
);

/** Pickles — a jar under a tied cloth lid. */
const Jar = () => (
  <svg {...box}>
    <path d="M8.5 11h15v14.5a2.5 2.5 0 0 1-2.5 2.5H11a2.5 2.5 0 0 1-2.5-2.5Z" fill={WASH} />
    <path d="M7.5 6.5h17V11h-17z" fill={ACCENT} stroke="currentColor" />
    <path d="M12 16.5h8M12 21h8" />
  </svg>
);

/** Thokkus — a mango, cooked down slowly. */
const Thokku = () => (
  <svg {...box}>
    <path d="M20 7c5 1.6 7.5 6.4 6.2 11.8C24.9 24.2 20.4 28 15.4 28 10.4 28 6.5 24.4 6.5 19.6c0-6 5-11 10.4-12" fill={WASH} />
    <path d="M17.4 7.2c-.6-1.8.3-3.4 2-4.2" stroke={ACCENT} strokeWidth="2" />
    <path d="M12 20c.4-3.4 2.6-5.8 5.6-6.6" />
  </svg>
);

/** Savouries — a coiled murukku, pressed by hand. */
const Murukku = () => (
  <svg {...box}>
    <circle cx="16" cy="16" r="11.5" fill={WASH} />
    <circle cx="16" cy="16" r="11.5" />
    <path d="M16 16a2.6 2.6 0 1 1 2.6 2.6A4.6 4.6 0 0 1 14 14a6.6 6.6 0 0 1 6.6-6.6" stroke={ACCENT} strokeWidth="1.8" />
    <path d="M16 16a2.6 2.6 0 1 1 2.6 2.6A4.6 4.6 0 0 1 14 14a6.6 6.6 0 0 1 6.6-6.6 8.6 8.6 0 0 1 8.6 8.6" />
  </svg>
);

/** Sweets — cut diamonds of burfi, one dressed with a silver leaf. */
const Burfi = () => (
  <svg {...box}>
    <path d="M16 4.5 27.5 16 16 27.5 4.5 16Z" fill={WASH} />
    <path d="M16 4.5 27.5 16 16 27.5 4.5 16Z" />
    <path d="M16 9.5 22.5 16 16 22.5 9.5 16Z" fill={ACCENT} stroke="currentColor" />
  </svg>
);

/** Vadam — batter dropped on a cloth and left in the sun. */
const Vadam = () => (
  <svg {...box}>
    <circle cx="16" cy="9" r="4.5" fill={ACCENT} stroke="currentColor" />
    <path d="M16 1.8v1.6M16 14.6v1.2M8.8 9h1.6M21.6 9h1.6M10.9 3.9l1.1 1.1M20 13l1.1 1.1M21.1 3.9 20 5M12 13l-1.1 1.1" />
    <path d="M4 24.5h24" />
    <circle cx="9.5" cy="21.5" r="3" fill={WASH} />
    <circle cx="16" cy="21.5" r="3" fill={WASH} />
    <circle cx="22.5" cy="21.5" r="3" fill={WASH} />
  </svg>
);

/** Vathal — sun-dried curd chillies. Tapered to a real point, or they read
    as blobs at this size. */
const Vathal = () => (
  <svg {...box}>
    {/* One fat crescent, wide at the shoulder and pointed at the tip — the
        shape is the whole story, so it gets the full frame rather than two
        small ones that read as pods. */}
    <path d="M19 9c4 1.8 6.2 6 5.6 10.6-.7 5.2-4.8 9.4-10.4 10.2 2.6-2.6 4.4-5.6 5-8.8.7-3.6.2-7.4-1.6-11-.3-.7.6-1.4 1.4-1Z" fill={WASH} />
    <path d="M19 9c4 1.8 6.2 6 5.6 10.6-.7 5.2-4.8 9.4-10.4 10.2 2.6-2.6 4.4-5.6 5-8.8.7-3.6.2-7.4-1.6-11-.3-.7.6-1.4 1.4-1Z" />
    <path d="M18 8.6c-1.6-1.4-3.6-1.8-6-1.2" stroke={ACCENT} strokeWidth="1.8" />
    <path d="M12 7.4c.6-1.4 1.8-2.2 3.6-2.4" stroke={ACCENT} strokeWidth="1.8" />
  </svg>
);

/** Appalams — a stack of sun-dried discs, drawn bottom-up so they overlap
    the way a real stack does. */
const Appalam = () => (
  <svg {...box}>
    <ellipse cx="16" cy="23.5" rx="11" ry="4.2" fill={WASH} stroke="currentColor" />
    <ellipse cx="16" cy="17" rx="10.3" ry="4" fill={WASH} stroke="currentColor" />
    <ellipse cx="16" cy="10.5" rx="9.6" ry="3.8" fill={ACCENT} stroke="currentColor" />
    <circle cx="16" cy="10.5" r="1.4" fill="none" stroke="currentColor" />
  </svg>
);

/** Instant mixes — a sealed sachet with a tear notch. */
const Sachet = () => (
  <svg {...box}>
    <path d="M8 9h16v18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 8 27Z" fill={WASH} />
    <path d="M7 5.5h18V9H7z" fill={ACCENT} stroke="currentColor" />
    <path d="M25 6.6l2.4-1.2M11.5 15h9M11.5 19.5h6" />
  </svg>
);

/** Snacks — a bowl of mixture. */
const Mixture = () => (
  <svg {...box}>
    <path d="M4.5 15.5h23c0 6.6-5.2 11.5-11.5 11.5S4.5 22.1 4.5 15.5Z" fill={WASH} />
    <path d="M4.5 15.5h23c0 6.6-5.2 11.5-11.5 11.5S4.5 22.1 4.5 15.5Z" />
    <path d="M9.5 11.5c1.6-1.4 3.4-1.4 5 0M17.5 9.5c1.6-1.4 3.4-1.4 5 0" stroke={ACCENT} strokeWidth="1.8" />
    <circle cx="12.5" cy="19.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="21" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="21" cy="17.8" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

/** Nuts & spices — star anise, the most drawable of the lot. */
const StarAnise = () => (
  <svg {...box}>
    <path d="M16 3.5 19 12l8.5-3-6 6.5 6 6.5-8.5-3-3 8.5-3-8.5-8.5 3 6-6.5-6-6.5 8.5 3Z" fill={WASH} />
    <path d="M16 3.5 19 12l8.5-3-6 6.5 6 6.5-8.5-3-3 8.5-3-8.5-8.5 3 6-6.5-6-6.5 8.5 3Z" />
    <circle cx="16" cy="16" r="3" fill={ACCENT} stroke="currentColor" />
  </svg>
);

/** Bakery — a biscuit. */
const Biscuit = () => (
  <svg {...box}>
    <circle cx="16" cy="16" r="11.5" fill={WASH} />
    <circle cx="16" cy="16" r="11.5" />
    <circle cx="12.5" cy="13" r="1.3" fill={ACCENT} stroke="none" />
    <circle cx="19.5" cy="14" r="1.3" fill={ACCENT} stroke="none" />
    <circle cx="15" cy="19.5" r="1.3" fill={ACCENT} stroke="none" />
    <circle cx="20.5" cy="20" r="1.3" fill={ACCENT} stroke="none" />
  </svg>
);

/** Native specials — a banana leaf, which is how any of this gets served. */
const Leaf = () => (
  <svg {...box}>
    <path d="M26.5 5.5C27.5 17 21 27 9 27c-2 0-3.5-.4-4.5-1 1-11.5 8-20.5 22-20.5Z" fill={WASH} />
    <path d="M26.5 5.5C27.5 17 21 27 9 27c-2 0-3.5-.4-4.5-1 1-11.5 8-20.5 22-20.5Z" />
    <path d="M4.5 26 26.5 5.5" stroke={ACCENT} strokeWidth="1.8" />
    <path d="M11 20.5c2-4 5-7 9-9M9.5 15c1.6-2.6 3.8-4.8 6.5-6.4" />
  </svg>
);

/** Ghee & oils — a bottle, cold-pressed in a wooden chekku. */
const Bottle = () => (
  <svg {...box}>
    <path d="M12.5 8.5h7v3.2l3 4V26a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V15.7l3-4Z" fill={WASH} />
    <path d="M12.5 8.5h7v3.2l3 4V26a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V15.7l3-4Z" />
    <path d="M13 4.5h6v4h-6z" fill={ACCENT} stroke="currentColor" />
    <path d="M9.5 19.5h13" />
  </svg>
);

/** Gift packs — a box, tied. */
const Gift = () => (
  <svg {...box}>
    <path d="M5.5 14h21v12.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5Z" fill={WASH} />
    <path d="M5.5 14h21v12.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5Z" />
    <path d="M4 9.5h24V14H4z" fill={ACCENT} stroke="currentColor" />
    <path d="M16 9.5V28" />
    <path d="M16 9.5s-3-4.8-5.4-3.4S12.8 9.5 16 9.5Zm0 0s3-4.8 5.4-3.4S19.2 9.5 16 9.5Z" fill={WASH} />
  </svg>
);

/** Fallback — a kolam rosette, not a wrong picture. */
const Kolam = () => (
  <svg {...box}>
    <circle cx="16" cy="16" r="3.4" fill={ACCENT} stroke="currentColor" />
    <path d="M16 6.5A9.5 9.5 0 0 1 25.5 16 9.5 9.5 0 0 1 16 25.5 9.5 9.5 0 0 1 6.5 16 9.5 9.5 0 0 1 16 6.5Z" />
    <circle cx="16" cy="3.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16" cy="28.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="28.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

const BY_SLUG: Record<string, () => React.JSX.Element> = {
  podis: Podi,
  pickles: Jar,
  thokkus: Thokku,
  savouries: Murukku,
  sweets: Burfi,
  vadam: Vadam,
  vathal: Vathal,
  appalams: Appalam,
  "instant-mixes": Sachet,
  snacks: Mixture,
  "nuts-spices": StarAnise,
  bakery: Biscuit,
  "native-specials": Leaf,
  "ghee-oils": Bottle,
  "gift-packs": Gift,
};

export function CategoryGlyph({ slug }: { slug: string }) {
  const Drawing = BY_SLUG[slug] ?? Kolam;
  return <Drawing />;
}
