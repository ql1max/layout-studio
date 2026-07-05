export type PageFormat = 'a4' | 'letter';

export type PageGeometry = {
  label: string;
  widthMm: number;
  heightMm: number;
  cssSize: string;
};

export const pageFormats: Record<PageFormat, PageGeometry> = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297, cssSize: 'A4' },
  letter: { label: 'US Letter', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter' },
};

export type SheetTheme = {
  name: string;
  page: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
  accentInk: string;
  rule: string;
  headingFont: 'sans' | 'serif';
};

export const themes: SheetTheme[] = [
  {
    name: 'Studio',
    page: '#ffffff',
    panel: '#f4f4f2',
    text: '#141414',
    muted: '#6d6d6b',
    accent: '#141414',
    accentInk: '#ffffff',
    rule: '#dcdcda',
    headingFont: 'sans',
  },
  {
    name: 'Ink',
    page: '#f6f1e7',
    panel: '#efe7d8',
    text: '#2c2117',
    muted: '#79695a',
    accent: '#b4552d',
    accentInk: '#ffffff',
    rule: '#ddd2bf',
    headingFont: 'serif',
  },
  {
    name: 'Signal',
    page: '#ffffff',
    panel: '#eef1f6',
    text: '#101623',
    muted: '#5d6575',
    accent: '#2244dd',
    accentInk: '#ffffff',
    rule: '#dbe0ea',
    headingFont: 'sans',
  },
  {
    name: 'Carbon',
    page: '#121214',
    panel: '#1c1c1f',
    text: '#f0f0ef',
    muted: '#9d9fa4',
    accent: '#e8e6e0',
    accentInk: '#121214',
    rule: '#2c2c30',
    headingFont: 'sans',
  },
];

export type HeroMotif = 'arcs' | 'dots' | 'wave';

export type ProductSheet = {
  id: string;
  brand: string;
  category: string;
  sku: string;
  name: string;
  tagline: string;
  intro: string;
  heroMotif: HeroMotif;
  features: { title: string; body: string }[];
  specs: { label: string; value: string }[];
  price: { label: string; value: string; note: string };
  contact: { company: string; web: string; email: string };
};

export const products: ProductSheet[] = [
  {
    id: 'aurora-one',
    brand: 'Halvdan',
    category: 'Task lighting',
    sku: 'HL-AUR-01',
    name: 'Aurora One',
    tagline: 'A desk lamp that understands the difference between glare and light.',
    intro:
      'Aurora One pairs a full-spectrum LED array with a machined aluminium head that rotates through 270 degrees. Color temperature follows the time of day by default, and a single dial overrides everything when you know what you want.',
    heroMotif: 'arcs',
    features: [
      {
        title: 'Adaptive spectrum',
        body: '2700K to 6500K, tuned automatically or set by hand.',
      },
      {
        title: 'Zero-flicker driver',
        body: 'Constant-current dimming from 5 to 100 percent.',
      },
      {
        title: 'One dial',
        body: 'Press to switch modes, turn to adjust. Nothing else.',
      },
    ],
    specs: [
      { label: 'Output', value: '1 100 lm' },
      { label: 'CRI', value: '97' },
      { label: 'Color range', value: '2700K to 6500K' },
      { label: 'Power', value: '12 W, USB-C PD' },
      { label: 'Materials', value: 'Aluminium, steel base' },
      { label: 'Reach', value: '82 cm articulated' },
      { label: 'Warranty', value: '5 years' },
    ],
    price: {
      label: 'MSRP',
      value: 'EUR 249',
      note: 'Available in graphite, bone, and moss.',
    },
    contact: {
      company: 'Halvdan Lighting ApS',
      web: 'halvdan.dk',
      email: 'sales@halvdan.dk',
    },
  },
  {
    id: 'meridian-k2',
    brand: 'Meridian',
    category: 'Espresso equipment',
    sku: 'MRD-K2-64',
    name: 'Meridian K2',
    tagline: 'A single-dose grinder built for people who weigh everything twice.',
    intro:
      'The K2 is a 64 mm flat-burr grinder with near-zero retention and a motor that holds RPM under load. Every part you touch is metal, every part that wears is replaceable, and the alignment is done at the factory, not by you.',
    heroMotif: 'dots',
    features: [
      {
        title: 'Near-zero retention',
        body: 'Under 0.1 g left behind between doses.',
      },
      {
        title: 'Stable RPM',
        body: '60 to 1 400 RPM, held steady under load.',
      },
      {
        title: 'Tool-free burr access',
        body: 'Open, clean, and realign in under a minute.',
      },
    ],
    specs: [
      { label: 'Burrs', value: '64 mm flat, steel' },
      { label: 'Speed', value: '60 to 1 400 RPM' },
      { label: 'Retention', value: '< 0.1 g' },
      { label: 'Dosing', value: 'Single dose, 35 g hopper' },
      { label: 'Noise', value: '68 dB at 1 m' },
      { label: 'Body', value: 'Machined aluminium' },
      { label: 'Weight', value: '6.2 kg' },
    ],
    price: {
      label: 'MSRP',
      value: 'USD 899',
      note: 'Ships with dosing cup, brush, and alignment report.',
    },
    contact: {
      company: 'Meridian Coffee Tools',
      web: 'meridiantools.co',
      email: 'hello@meridiantools.co',
    },
  },
  {
    id: 'torden-65',
    brand: 'Torden',
    category: 'Portable audio',
    sku: 'TRD-65-BLK',
    name: 'Torden 65',
    tagline: 'Room-scale sound from a speaker that fits in a pannier.',
    intro:
      'Torden 65 is a two-way portable speaker with a real passive radiator and a DSP tuned for outdoor listening. It charges over USB-C, survives rain, and pairs to two phones at once so nobody argues about the queue.',
    heroMotif: 'wave',
    features: [
      {
        title: 'Two-way driver array',
        body: 'A 65 mm woofer and 19 mm tweeter, actively crossed.',
      },
      {
        title: '30-hour battery',
        body: 'USB-C in and out, so it charges your phone too.',
      },
      {
        title: 'IP67 sealed',
        body: 'Rain, dust, and one accidental river are fine.',
      },
    ],
    specs: [
      { label: 'Drivers', value: '65 mm + 19 mm' },
      { label: 'Power', value: '2 x 15 W RMS' },
      { label: 'Battery', value: '30 h at 60 percent volume' },
      { label: 'Charging', value: 'USB-C PD, 3 h full' },
      { label: 'Rating', value: 'IP67' },
      { label: 'Codecs', value: 'AAC, aptX Adaptive' },
      { label: 'Weight', value: '780 g' },
    ],
    price: {
      label: 'MSRP',
      value: 'EUR 179',
      note: 'Black, sand, and signal orange.',
    },
    contact: {
      company: 'Torden Audio AB',
      web: 'tordenaudio.se',
      email: 'orders@tordenaudio.se',
    },
  },
];
