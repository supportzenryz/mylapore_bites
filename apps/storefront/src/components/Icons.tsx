/**
 * Original line icons, drawn on a 24-grid with a 1.6 stroke.
 *
 * The four "how it works" glyphs are deliberately literal about OUR process —
 * an order slip, a kadai over a flame, a tied parcel, a scooter — rather than
 * generic e-commerce symbols, because the process is the product here.
 */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconHome = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 10.5 12 4l8.5 6.5" />
    <path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8" />
    <path d="M9.8 20v-5.2h4.4V20" />
  </svg>
);

export const IconShop = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 8h16l-1 11a1 1 0 0 1-1 .9H6A1 1 0 0 1 5 19Z" />
    <path d="M8.6 8V6.4a3.4 3.4 0 0 1 6.8 0V8" />
  </svg>
);

export const IconSearch = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.5 15.5 4 4" />
  </svg>
);

export const IconCart = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 4.5h2.2l2.1 10.2a1.4 1.4 0 0 0 1.4 1.1h8.1a1.4 1.4 0 0 0 1.4-1.1L20 7.6H6" />
    <circle cx="9.4" cy="19.4" r="1.3" />
    <circle cx="16.9" cy="19.4" r="1.3" />
  </svg>
);

export const IconAccount = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8.4" r="3.7" />
    <path d="M4.9 20c.6-3.6 3.6-5.8 7.1-5.8s6.5 2.2 7.1 5.8" />
  </svg>
);

export const IconPin = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.6" r="2.3" />
  </svg>
);

/** 1. You order — an order slip. */
export const IconOrder = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3.5h12v15.8l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 19.3Z" />
    <path d="M9.2 8h5.6M9.2 11.4h5.6M9.2 14.8h3.4" />
  </svg>
);

/** 2. We prepare — a kadai over a flame. */
export const IconKadai = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.6 9.4h16.8a8.4 8.4 0 0 1-8.4 7.4 8.4 8.4 0 0 1-8.4-7.4Z" />
    <path d="M20.4 10.2h1.4M2.2 10.2h1.4" />
    <path d="M9 6.6c0-1.2 1.4-1.5 1.4-2.8M13 6.6c0-1.4 1.6-1.7 1.6-3.1" />
    <path d="M8 20.4h8" />
  </svg>
);

/** 3. We pack — a tied parcel. */
export const IconParcel = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.6 7.8 12 4l8.4 3.8v8.4L12 20l-8.4-3.8Z" />
    <path d="M12 11.6V20" />
    <path d="m3.6 7.8 8.4 3.8 8.4-3.8" />
    <path d="M8.2 5.9v3.9" />
  </svg>
);

/** 4. We deliver — a scooter, because that is how Chennai actually moves. */
export const IconScooter = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="5.6" cy="17.2" r="2.6" />
    <circle cx="18.4" cy="17.2" r="2.6" />
    <path d="M8.2 17.2h7.6" />
    <path d="M15.8 17.2 13.4 8.2H10" />
    <path d="M13.4 8.2h3.2l1.8 8.2" />
    <path d="M5.8 12.4h3.8" />
  </svg>
);

export const IconLeaf = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5.4 18.6C4 13.8 7.4 6.6 18.8 5.4c1 9.8-5.2 14.4-10.4 13.6" />
    <path d="M8.4 18.8c1.4-4.2 4-7.2 7.4-9.2" />
  </svg>
);

export const IconBasketEmpty = ({ size = 56, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.2 8.2h17.6l-1.6 11a1.4 1.4 0 0 1-1.4 1.2H6.2a1.4 1.4 0 0 1-1.4-1.2Z" />
    <path d="M8.4 8.2 10.6 3.4M15.6 8.2 13.4 3.4" />
  </svg>
);

/** Generic category glyph — a kolam-style four-dot rosette. */
export const IconKolam = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="2.4" />
    <circle cx="12" cy="4.6" r="1.2" />
    <circle cx="12" cy="19.4" r="1.2" />
    <circle cx="4.6" cy="12" r="1.2" />
    <circle cx="19.4" cy="12" r="1.2" />
    <path d="M12 7v2.6M12 14.4V17M7 12h2.6M14.4 12H17" />
  </svg>
);
