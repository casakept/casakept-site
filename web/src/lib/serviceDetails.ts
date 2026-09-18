// Canonical source for the rich "what's actually included" copy from the
// /services guide -- rendered both on /services itself and in the booking
// wizard's "See full details" popup, so the two can't drift out of sync.
// Keyed by the exact services.name string (the catalog has no separate
// slug column) -- a future rename just falls back to the plain DB
// description rather than breaking, see ServiceDetailModal.

export type ServiceDetailBlock = { heading: string; items: string[] };

export type ServiceDetail = {
  summaryTag?: string;
  blocks?: ServiceDetailBlock[];
  paragraphs?: string[];
  footnote?: string;
};

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  "Standard clean": {
    summaryTag: "~2–2.5 hrs · included in every membership",
    blocks: [
      {
        heading: "Every room",
        items: [
          "Vacuum & mop all floors, edge to edge",
          "Dust all reachable surfaces, shelves & sills",
          "Wipe switches, handles & high-touch points",
          "Trash out, beds made, general tidy",
        ],
      },
      {
        heading: "Kitchen",
        items: [
          "Counters & backsplash sanitized, sink polished",
          "Appliance exteriors, microwave in & out",
          "Stovetop degreased, cabinet fronts spot-wiped",
        ],
      },
      {
        heading: "Bathrooms",
        items: [
          "Toilets, showers & tubs scrubbed and disinfected",
          "Sinks, counters, fixtures & mirrors shined",
          "Floors sanitized",
        ],
      },
    ],
    footnote:
      "Every recurring visit also rotates in a detail zone -- kitchen & bathrooms on one visit, living & sleeping areas the next -- so oven, fridge, baseboards, and windows never go too long without attention, even between deep cleans.",
  },
  "Deep clean": {
    summaryTag: "~4–6 hrs · everything in Standard Clean, plus:",
    blocks: [
      {
        heading: "Every room",
        items: [
          "Vacuum & mop all floors, edge to edge",
          "Dust all reachable surfaces, shelves & sills",
          "Wipe switches, handles & high-touch points",
          "Trash out, beds made, general tidy",
        ],
      },
      {
        heading: "Every room — added",
        items: [
          "Baseboards hand-wiped throughout",
          "Ceiling fans & blinds cleaned slat by slat",
          "Door frames, trim, vents & window tracks",
          "Under & behind reachable furniture; wall spot-cleaning",
        ],
      },
      {
        heading: "Kitchen",
        items: [
          "Counters & backsplash sanitized, sink polished",
          "Appliance exteriors, microwave in & out",
          "Stovetop degreased, cabinet fronts spot-wiped",
        ],
      },
      {
        heading: "Kitchen — added",
        items: [
          "Oven cleaned inside, racks included",
          "Refrigerator cleaned inside, shelf by shelf",
          "Range hood degreased; cabinets washed top to bottom",
        ],
      },
      {
        heading: "Bathrooms",
        items: [
          "Toilets, showers & tubs scrubbed and disinfected",
          "Sinks, counters, fixtures & mirrors shined",
          "Floors sanitized",
        ],
      },
      {
        heading: "Bathrooms — added",
        items: ["Grout & tile detail scrub", "Hard-water & soap-scum removal"],
      },
    ],
    footnote: "New members get 15% off their first deep clean. Included quarterly on Casa Completa.",
  },
  "Move-in / move-out clean": {
    summaryTag: "Starting price -- scopes above 2,500 sq ft priced per walkthrough",
    paragraphs: [
      "Everything in a Deep Clean, done to move-out standard, plus a deposit-back photo set documenting the home's condition when we leave.",
    ],
  },
  "Carpet cleaning": {
    summaryTag: "3-room minimum",
    paragraphs: [
      "Hot-water extraction on every room booked. $45/room as an add-on to another service; $60/room booked solo. Large furniture should be moved out of the room beforehand for wall-to-wall jobs.",
    ],
  },
  "Window cleaning, inside & out": {
    summaryTag: "Up to 15 windows",
    paragraphs: ["Interior and exterior glass, tracks, and screens included."],
  },
  "Home organization": {
    summaryTag: "3-hour minimum, billed hourly",
    paragraphs: [
      "Pantries, closets, garages, playrooms. Full empty-out, sort with you deciding keep/donate/toss, donation drop-off included, labeled systems that survive real life. Product budgets always approved first.",
    ],
    footnote: "Members save 10–20% off the hourly rate.",
  },
  "Laundry, per bag": {
    summaryTag: "48-hour return",
    paragraphs: [
      "Fill the CasaKept bag (~15–18 lbs), leave it on the porch. Sorted, washed in its own machine — never mixed with other households — stain pre-treated, folded drawer-ready, back in 24–48 hours with a photo of the finished order.",
      "Late past 48 hours? That order's free.",
    ],
    footnote: "Comforters and oversized bedding priced per piece. Members get a lower per-bag rate.",
  },
  "Laundry, same-day rush": {
    summaryTag: "Same-day turnaround",
    paragraphs: ["Same CasaKept bag process as standard laundry, returned the same day instead of within 48 hours."],
  },
  "Grocery pickup + delivery": {
    paragraphs: [
      "Your list, your store. We shop, deliver to your kitchen, and put cold items away — receipt photo sent, groceries at actual cost with no markup.",
    ],
  },
  "Fridge cleanout + restock": {
    paragraphs: [
      "Everything out, shelves washed, restocked oldest-first so food stops dying in the back. Groceries billed at actual cost with a receipt photo, no markup.",
    ],
  },
  "Errands - To Go": {
    summaryTag: "Within a 25-mile radius, up to 3 stops",
    paragraphs: [
      "Package returns, dry cleaning, post office, pharmacy — proof-of-drop photos every stop.",
    ],
  },
  "Errands - Wait at Home": {
    summaryTag: "Booked at an hourly rate",
    paragraphs: [
      "We'll wait at your home for the \"between 8 and 2\" repair window so you don't have to burn a vacation day.",
    ],
  },
};
