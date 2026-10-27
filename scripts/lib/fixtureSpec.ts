// Seeded listing data for the fixture corpus. Everything here is invented: brand names are
// assembled from syllables, titles from category phrase lists, prices and ratings from a seeded
// generator. Nothing is copied from a store.
import { mulberry32, type Silhouette } from './synth';

export type Store = 'amazon-us' | 'walmart-us';

export interface Category {
  slug: string;
  query: string;
  noun: string;
  silhouette: Silhouette;
  adjectives: string[];
  features: string[];
  targets: string[];
  price: [number, number];
  /** Pack-friendly goods get "2 Pack" style titles. */
  packable: boolean;
}

export const CATEGORIES: Category[] = [
  {
    slug: 'laptop-stand',
    query: 'laptop stand',
    noun: 'Laptop Stand',
    silhouette: 'stand',
    adjectives: ['Adjustable', 'Ergonomic', 'Portable', 'Foldable', 'Aluminum', 'Ventilated'],
    features: [
      'Height Adjustable',
      'with Cooling Vents',
      'Non-Slip Silicone Pads',
      'Foldable and Portable',
      'Tool-Free Assembly',
    ],
    targets: ['MacBook Air Pro', 'Laptops 10-17 Inch', 'Dell HP Lenovo Notebooks', 'Desk and Home Office'],
    price: [11, 48],
    packable: false,
  },
  {
    slug: 'led-strip-lights',
    query: 'led strip lights',
    noun: 'LED Strip Lights',
    silhouette: 'strip',
    adjectives: ['Color Changing', 'Waterproof', 'Dimmable', 'Smart', 'RGB', 'Flexible'],
    features: [
      'with Remote Control',
      'Music Sync',
      'Self-Adhesive Backing',
      'App Control',
      '16 Million Colors',
    ],
    targets: ['Bedroom', 'Gaming Room', 'TV Backlight', 'Party and Home Decoration'],
    price: [8, 36],
    packable: true,
  },
  {
    slug: 'phone-tripod',
    query: 'phone tripod',
    noun: 'Phone Tripod',
    silhouette: 'tripod',
    adjectives: ['Flexible', 'Extendable', 'Lightweight', 'Heavy Duty', 'Compact', 'Adjustable'],
    features: [
      'with Bluetooth Remote',
      '360 Degree Rotation',
      'Carry Bag Included',
      'Quick Release Plate',
      'Travel Friendly',
    ],
    targets: ['iPhone and Android', 'Video Recording', 'Vlogging and Live Streaming', 'Camera and Phone'],
    price: [9, 40],
    packable: false,
  },
  {
    slug: 'silicone-spatula-set',
    query: 'silicone spatula set',
    noun: 'Silicone Spatula Set',
    silhouette: 'kit',
    adjectives: ['Heat Resistant', 'Non-Stick', 'BPA Free', 'Seamless', 'Flexible', 'Dishwasher Safe'],
    features: [
      'Stainless Steel Core',
      '600F Heat Resistance',
      '5 Piece Kitchen Utensils',
      'One-Piece Design',
    ],
    targets: ['Cooking and Baking', 'Nonstick Cookware', 'Kitchen Gadgets'],
    price: [7, 29],
    packable: true,
  },
  {
    slug: 'dog-poop-bags',
    query: 'dog poop bags',
    noun: 'Dog Poop Bags',
    silhouette: 'ring',
    adjectives: ['Biodegradable', 'Leak Proof', 'Extra Thick', 'Unscented', 'Eco Friendly', 'Compostable'],
    features: ['with Dispenser', 'Rolls of 15 Bags', 'Easy Tear Perforation', 'Leash Clip Included'],
    targets: ['Dog Waste', 'Pet Walking', 'Outdoor Cleanup'],
    price: [5, 22],
    packable: true,
  },
  {
    slug: 'cable-organizer',
    query: 'cable organizer',
    noun: 'Cable Organizer',
    silhouette: 'tray',
    adjectives: ['Magnetic', 'Silicone', 'Adhesive', 'Under Desk', 'Reusable', 'Self-Closing'],
    features: ['Cord Management Clips', 'Wire Holder Set', 'Cable Sleeve Wrap', 'Desk Cable Box'],
    targets: ['Desk and Office', 'TV and Computer Cords', 'Charging Cables', 'Home Theater'],
    price: [6, 27],
    packable: true,
  },
  {
    slug: 'ring-light',
    query: 'ring light',
    noun: 'Ring Light',
    silhouette: 'ring',
    adjectives: ['Dimmable', 'LED', 'Selfie', 'Studio', 'Clip-On', 'Rechargeable'],
    features: ['with Tripod Stand', '3 Light Modes', 'Phone Holder Included', 'Remote Shutter'],
    targets: ['Video Recording', 'Makeup and Streaming', 'Photography', 'Zoom Calls'],
    price: [10, 52],
    packable: false,
  },
  {
    slug: 'acrylic-paint-set',
    query: 'acrylic paint set',
    noun: 'Acrylic Paint Set',
    silhouette: 'jar',
    adjectives: ['Non-Toxic', 'Quick Dry', 'Professional', 'Vibrant', 'Washable', 'Artist Grade'],
    features: ['24 Colors with Brushes', 'Rich Pigments', 'Palette Included', 'Waterproof Finish'],
    targets: ['Canvas and Wood', 'Kids and Adults', 'Beginners and Artists', 'Rock Painting'],
    price: [9, 38],
    packable: true,
  },
  {
    slug: 'shower-caddy',
    query: 'shower caddy',
    noun: 'Shower Caddy',
    silhouette: 'tray',
    adjectives: ['Rustproof', 'Adhesive', 'Hanging', 'Stainless Steel', 'Corner', 'Wall Mounted'],
    features: ['No Drilling', 'with Hooks', '2 Tier Storage', 'Large Capacity'],
    targets: ['Bathroom and Shower', 'Shampoo and Soap', 'Kitchen and Dorm'],
    price: [10, 44],
    packable: true,
  },
  {
    slug: 'kitchen-scale',
    query: 'kitchen scale',
    noun: 'Kitchen Scale',
    silhouette: 'tray',
    adjectives: ['Digital', 'Stainless Steel', 'Slim', 'Waterproof', 'Precise', 'Compact'],
    features: ['High Precision 0.1g', 'Tare Function', 'Backlit LCD Display', 'Battery Included'],
    targets: ['Food and Baking', 'Cooking and Coffee', 'Diet and Meal Prep'],
    price: [8, 34],
    packable: false,
  },
  {
    slug: 'usb-c-hub',
    query: 'usb c hub',
    noun: 'USB C Hub',
    silhouette: 'tray',
    adjectives: ['Multiport', 'Aluminum', 'Slim', '7-in-1', '4K HDMI', 'Compact'],
    features: ['100W Power Delivery', 'SD Card Reader', 'Dual USB 3.0 Ports', 'Plug and Play'],
    targets: ['MacBook Pro Air', 'iPad Pro and Laptops', 'Dell XPS and Chromebook'],
    price: [12, 49],
    packable: false,
  },
  {
    slug: 'plant-pots',
    query: 'plant pots',
    noun: 'Plant Pots',
    silhouette: 'jar',
    adjectives: ['Ceramic', 'Self Watering', 'Modern', 'Large', 'Hanging', 'Plastic'],
    features: ['with Drainage Holes', 'and Saucers', 'Set of Succulent Planters', 'Bamboo Tray'],
    targets: ['Indoor Plants', 'Succulents and Cacti', 'Herbs and Flowers', 'Home Garden'],
    price: [9, 40],
    packable: true,
  },
];

const COLORS = ['Black', 'White', 'Silver', 'Grey', 'Blue', 'Green', 'Pink'];

/** Reproducible made-up brand: two or three syllables, a mix of upper and title case. */
export function inventBrand(rnd: () => number, used: Set<string>): string {
  const onset = [
    'Z',
    'V',
    'L',
    'K',
    'N',
    'R',
    'M',
    'T',
    'B',
    'Q',
    'D',
    'S',
    'F',
    'G',
    'H',
    'P',
    'W',
    'J',
    'X',
    'Y',
  ];
  const nucleus = ['a', 'e', 'i', 'o', 'u', 'ae', 'io', 'ou'];
  const coda = ['x', 'n', 'r', 'l', 'm', 'k', 't', 'v', 'z', 'th', 'rd', 'nt'];
  for (let attempt = 0; attempt < 50; attempt++) {
    const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)] as T;
    let name = pick(onset) + pick(nucleus) + pick(coda) + pick(onset).toLowerCase() + pick(nucleus);
    if (rnd() < 0.4) name += pick(coda);
    name = rnd() < 0.45 ? name.toUpperCase() : name;
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase());
      return name;
    }
  }
  throw new Error('Could not invent a unique brand');
}

export interface ListingSpec {
  id: string;
  title: string;
  brand: string;
  /** How the store prints the brand on the tile. */
  brandStyle: 'heading' | 'byline' | 'none';
  price: number | null;
  priceRange: [number, number] | null;
  strikePrice: number | null;
  unitPriceText: string | null;
  rating: number | null;
  reviews: number | null;
  sponsored: boolean;
  /** Key of the photo this listing shows. Equal keys mean the same factory photo. */
  photo: string;
  /** Seed of the photo (for rendering). */
  photoSeed: number;
  hueShift: number;
  /** Whether the displayed copy is a re-upload (transformed) of the source photo. */
  reupload: boolean;
  imageId: string;
}

export interface PageSpec {
  store: Store;
  slug: string;
  category: Category;
  query: string;
  page: number;
  seed: number;
  listings: ListingSpec[];
  /** Twin groups by listing id. */
  groups: string[][];
  /** Variant families by listing id (same brand, colour/size differences). */
  variantFamilies: string[][];
  widgets: number;
}

export interface PageOptions {
  store: Store;
  category: Category;
  slug: string;
  seed: number;
  tiles: number;
  groupSizes: number[];
  variantFamilies: number;
  page?: number;
  /** Overrides for hand-authored demo pages. */
  demo?: boolean;
}

function idFor(store: Store, rnd: () => number): string {
  if (store === 'walmart-us') return String(100_000_000 + Math.floor(rnd() * 899_999_999));
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let s = 'B0';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(rnd() * chars.length)];
  return s;
}

function titleFor(c: Category, brand: string, rnd: () => number, pack: number | null): string {
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)] as T;
  const a1 = pick(c.adjectives);
  const a2 = pick(c.adjectives.filter((x) => x !== a1));
  const feat = pick(c.features);
  const target = pick(c.targets);
  const packText = pack ? ` ${pack} Pack` : '';
  switch (Math.floor(rnd() * 4)) {
    case 0:
      return `${brand} ${a1} ${c.noun}${packText} for ${target}, ${feat}`;
    case 1:
      return `${brand} ${c.noun}${packText}, ${a1} ${a2} ${feat}`;
    case 2:
      return `${brand} ${a1} ${c.noun}${packText} ${feat} - ${target}`;
    default:
      return `${brand} ${a2} ${c.noun}${packText} with ${feat.replace(/^with /i, '')} for ${target}`;
  }
}

function reviewsFor(rnd: () => number): number {
  const r = rnd();
  if (r < 0.12) return Math.floor(rnd() * 10);
  if (r < 0.45) return 10 + Math.floor(rnd() * 190);
  if (r < 0.85) return 200 + Math.floor(rnd() * 3800);
  return 4000 + Math.floor(rnd() * 26000);
}

/** One results page: twin groups, variant families and one-off listings in a seeded order. */
export function buildPage(opts: PageOptions): PageSpec {
  const rnd = mulberry32(opts.seed);
  const c = opts.category;
  const brands = new Set<string>();
  const ids = new Set<string>();
  const newId = () => {
    let id = idFor(opts.store, rnd);
    while (ids.has(id)) id = idFor(opts.store, rnd);
    ids.add(id);
    return id;
  };
  let photoCounter = 0;
  const nextPhoto = () => {
    photoCounter++;
    return { photo: `p${photoCounter}`, photoSeed: Math.floor(rnd() * 1e9) };
  };
  const imageId = () => Math.floor(rnd() * 1e15).toString(36) + Math.floor(rnd() * 1e9).toString(36);

  const base = (
    brand: string,
    photo: { photo: string; photoSeed: number },
    reupload: boolean,
    priceBase: number,
  ): ListingSpec => {
    const pack = c.packable && rnd() < 0.18 ? ([2, 3, 4][Math.floor(rnd() * 3)] ?? 2) : null;
    const missingPrice = rnd() < 0.05;
    const price = missingPrice ? null : Math.round(priceBase * (pack ?? 1) * 100) / 100;
    const hasRange = !missingPrice && rnd() < 0.06;
    const rating = rnd() < 0.04 ? null : Math.round((3.5 + rnd() * 1.3) * 10) / 10;
    return {
      id: newId(),
      title: titleFor(c, brand, rnd, pack),
      brand,
      brandStyle: rnd() < 0.5 ? 'heading' : rnd() < 0.8 ? 'byline' : 'none',
      price,
      priceRange: hasRange && price ? [price, Math.round(price * 1.4 * 100) / 100] : null,
      strikePrice: price && rnd() < 0.25 ? Math.round(price * 1.3 * 100) / 100 : null,
      unitPriceText: pack && price ? `($${(price / pack).toFixed(2)}/count)` : null,
      rating,
      reviews: rating == null ? null : reviewsFor(rnd),
      sponsored: rnd() < 0.1,
      photo: photo.photo,
      photoSeed: photo.photoSeed,
      hueShift: 0,
      reupload,
      imageId: imageId(),
    };
  };

  const listings: ListingSpec[] = [];
  const groups: string[][] = [];
  const priceFor = () => c.price[0] + rnd() * (c.price[1] - c.price[0]);

  for (const size of opts.groupSizes) {
    const photo = nextPhoto();
    const lowPrice = c.price[0] + rnd() * (c.price[1] - c.price[0]) * 0.4;
    const members: ListingSpec[] = [];
    for (let i = 0; i < size; i++) {
      // The ladder: same photo, prices from the base up to about three times it.
      const m = base(
        inventBrand(rnd, brands),
        photo,
        i > 0,
        lowPrice * (1 + (i / Math.max(1, size - 1)) * (0.4 + rnd() * 1.6)),
      );
      members.push(m);
    }
    groups.push(members.map((m) => m.id));
    listings.push(...members);
  }

  const variantFamilies: string[][] = [];
  for (let f = 0; f < opts.variantFamilies; f++) {
    const brand = inventBrand(rnd, brands);
    const size = 2 + Math.floor(rnd() * 2);
    const photo = nextPhoto();
    const stemTitle = titleFor(c, brand, rnd, null);
    const price = priceFor();
    const members: ListingSpec[] = [];
    for (let i = 0; i < size; i++) {
      const m = base(brand, photo, false, price);
      m.brandStyle = 'heading';
      // Same listing, different colour: the title differs by a colour word only.
      m.title = `${stemTitle} ${COLORS[(f + i * 2) % COLORS.length]}`;
      m.hueShift = i * 70;
      members.push(m);
    }
    variantFamilies.push(members.map((m) => m.id));
    listings.push(...members);
  }

  while (listings.length < opts.tiles) {
    listings.push(base(inventBrand(rnd, brands), nextPhoto(), false, priceFor()));
  }

  // Seeded shuffle so group members are spread across the page like real results.
  for (let i = listings.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [listings[i], listings[j]] = [listings[j] as ListingSpec, listings[i] as ListingSpec];
  }

  return {
    store: opts.store,
    slug: opts.slug,
    category: c,
    query: c.query,
    page: opts.page ?? 1,
    seed: opts.seed,
    listings,
    groups,
    variantFamilies,
    widgets: 4,
  };
}
