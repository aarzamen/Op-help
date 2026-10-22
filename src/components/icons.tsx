import React from 'react';

/**
 * The app's own icon set, drawn to the same construction as lucide (24 × 24 grid, 2 px
 * round-capped stroke, currentColor, no fills except dots) so custom and library icons sit
 * together. Military-specific shapes lucide doesn't have live here. Decorative: the block
 * or button text carries the meaning. See docs/DESIGN-SYSTEM.md.
 */
const Svg = ({ size = 22, children }: { size?: number; children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

type P = { size?: number };
const dot = (cx: number, cy: number, r = 1.2) => (
  <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
);

// ----- method / reference -----

/** Named plans: a folder holding the order. */
export const IconPlans = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M7 11h10M7 15h7" />
  </Svg>
);

/** Grading sheet: clipboard with a check. */
export const IconRubric = ({ size }: P) => (
  <Svg size={size}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
    <path d="M9 13.5l2 2 4-4.5" />
  </Svg>
);

/** Taking an order apart: document under a magnifier. */
export const IconDissect = ({ size }: P) => (
  <Svg size={size}>
    <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
    <path d="M13 3l5 5v2" />
    <path d="M8 9h4M8 13h2" />
    <circle cx="16" cy="16" r="3.5" />
    <path d="M18.6 18.6L21 21" />
  </Svg>
);

/** Writing: pen on a line. */
export const IconPen = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 21h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);

/** Task verbs: an arrow into a target. */
export const IconVerb = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="11" cy="13" r="8" />
    <circle cx="11" cy="13" r="4" />
    {dot(11, 13)}
    <path d="M21 3l-7.5 7.5M16 3h5v5" />
  </Svg>
);

/** Terrain model: a hill with contours on a board, flag on the objective. */
export const IconTerrain = ({ size }: P) => (
  <Svg size={size}>
    <path d="M2 19h20" />
    <path d="M4 19c1.6-5 4-8 8-8s6.4 3 8 8" />
    <path d="M8.5 19c.8-2.6 2-4 3.5-4s2.7 1.4 3.5 4" />
    <path d="M12 11V4l3.5 1.6L12 7.2" />
  </Svg>
);

/** Coming from clinical practice: stethoscope. */
export const IconClinical = ({ size }: P) => (
  <Svg size={size}>
    <path d="M5 3v5a4 4 0 0 0 8 0V3" />
    <path d="M9 12v2.5a5 5 0 0 0 10 0V13" />
    <circle cx="19" cy="11" r="2" />
    <path d="M4 3h2M12 3h2" />
  </Svg>
);

/** Warfighting concepts: the OODA loop. */
export const IconLoop = ({ size }: P) => (
  <Svg size={size}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20 3v5h-5" />
    <path d="M9 12h6M12 9v6" />
  </Svg>
);

/** Glossary: book with an A. */
export const IconGlossary = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    <path d="M9.5 13l2.5-6 2.5 6M10.5 11h3" />
  </Svg>
);

/** Free notes: pencil over a sheet. */
export const IconNotes = ({ size }: P) => (
  <Svg size={size}>
    <path d="M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    <path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12 14.6l-4 1 1-4z" />
  </Svg>
);

/** Order header: a document with its classification banner. */
export const IconHeader = ({ size }: P) => (
  <Svg size={size}>
    <rect x="4" y="2.5" width="16" height="19" rx="2" />
    <path d="M4 7h16" />
    <path d="M8 11h8M8 14.5h8M8 18h5" />
  </Svg>
);

/** Time hack: stopwatch (replaces the ⏱ emoji, which iOS drew in color). */
export const IconStopwatch = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 10v3.5l2.5 1.5" />
    <path d="M10 2.5h4M12 2.5V6M18.5 6.5L20 5" />
  </Svg>
);

/** Common mistakes. */
export const IconX = ({ size }: P) => (
  <Svg size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

/** Say it like a directive: megaphone. */
export const IconDirective = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3 10.5v3a1 1 0 0 0 1 1h2l6 4.5V5L6 9.5H4a1 1 0 0 0-1 1z" />
    <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
  </Svg>
);

// ----- tools / control measures -----

/** PCC / PCI: checklist. */
export const IconChecklist = ({ size }: P) => (
  <Svg size={size}>
    <path d="M3 6l1.5 1.5L7.5 4.5M3 12l1.5 1.5 3-3M3 18l1.5 1.5 3-3" />
    <path d="M11 6h10M11 12h10M11 18h10" />
  </Svg>
);

/** Order types: stacked orders. */
export const IconOrders = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 3h7l4 4v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M16 3v4h4" />
    <path d="M4 7v12a3 3 0 0 0 3 3h8" />
  </Svg>
);

/** Boundary: a line with its XX echelon marker. */
export const IconBoundary = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 2v20" />
    <path d="M6 10l3 3M9 10l-3 3M15 10l3 3M18 10l-3 3" />
  </Svg>
);

/** Lines & routes: a phase line crossed by a route arrow. */
export const IconPhaseLine = ({ size }: P) => (
  <Svg size={size}>
    <path d="M9 2v20" strokeDasharray="2.5 3" />
    <path d="M3 19c5 0 6-12 11-12h6" />
    <path d="M17 4l3 3-3 3" />
  </Svg>
);

/** Points & positions: an objective outline. */
export const IconObjective = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4.5 12c0-4.2 3.2-7.5 7.6-7.5 3.4 0 7.4 2 7.4 6.4 0 5-4 8.6-8.3 8.6-3.6 0-6.7-3.2-6.7-7.5z" />
    {dot(12, 12, 1.6)}
  </Svg>
);

/** Fire control: crosshair. */
export const IconFireControl = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
  </Svg>
);

/** Engineer measures: concertina wire. */
export const IconWire = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="6" cy="12" r="3.2" />
    <circle cx="10" cy="12" r="3.2" />
    <circle cx="14" cy="12" r="3.2" />
    <circle cx="18" cy="12" r="3.2" />
    <path d="M2 18.5h20" />
  </Svg>
);

// ----- CASEVAC -----

/** Landing zone: the H. */
export const IconHlz = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 8v8M15 8v8M9 12h6" />
  </Svg>
);

/** Approach, departure & wind: windsock. */
export const IconWindsock = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 21V3" />
    <path d="M4 4.5l15 2v5l-15 2" />
    <path d="M9 5.2v7.6M14 5.9v6.2" />
  </Svg>
);

/** Obstacles: a tree. */
export const IconTree = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 2.5l5 8h-3l4 6.5H6l4-6.5H7z" />
    <path d="M12 17v4.5" />
  </Svg>
);

/** Marking: panel / flag. */
export const IconMarking = ({ size }: P) => (
  <Svg size={size}>
    <path d="M5 21.5V3.5" />
    <path d="M5 4h12l-2.5 4.5L17 13H5" />
  </Svg>
);

/** Security: shield. */
export const IconShield = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 2.5l7.5 3v5.5c0 5-3.6 8.6-7.5 10.5-3.9-1.9-7.5-5.5-7.5-10.5V5.5z" />
  </Svg>
);

/** Casualty collection point: the cross. */
export const IconCcp = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M12 7.5v9M7.5 12h9" />
  </Svg>
);

/** CCP areas: a floor plan. */
export const IconLayout = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 10h18M10 10v11M15 3v7" />
  </Svg>
);

/** Staff: a medic. */
export const IconMedic = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="9" cy="7" r="3.5" />
    <path d="M3 21v-1a6 6 0 0 1 10-4.5" />
    <path d="M18 13v7M14.5 16.5h7" />
  </Svg>
);

/** Evacuation chain: stops joined by legs. */
export const IconChain = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="4.5" cy="17" r="2" />
    <circle cx="12" cy="7" r="2" />
    <circle cx="19.5" cy="17" r="2" />
    <path d="M5.7 15.3l5.1-6.6M13.2 8.7l5.1 6.6" />
  </Svg>
);

/** PACE & precedence: stacked plans. */
export const IconPace = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 3l9 4.5-9 4.5-9-4.5z" />
    <path d="M3 12l9 4.5 9-4.5" />
    <path d="M3 16.5l9 4.5 9-4.5" />
  </Svg>
);

/** 9-line: handheld radio. */
export const IconRadio = ({ size }: P) => (
  <Svg size={size}>
    <rect x="6" y="8" width="12" height="14" rx="2" />
    <path d="M9 8V2" />
    <path d="M9 13h6M9 16.5h6" />
  </Svg>
);

/** MIST: casualty card with a pulse. */
export const IconMist = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M6 12h3l2-4 2 8 2-4h3" />
  </Svg>
);
