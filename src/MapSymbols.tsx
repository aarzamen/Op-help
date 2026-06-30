import React from "react";

/**
 * NATO / US tactical map symbols — battalion-level reference set.
 * Bare-geometry inline SVG so glyphs inherit `currentColor` from the card,
 * which means BLACKOUT MODE recolors them automatically (no extra CSS).
 * The medical cross is the single intentional exception: it uses
 * var(--accent-red), which blackout already remaps to red.
 *
 * Affiliation is encoded by FRAME SHAPE, per APP-6:
 *   rectangle = friendly · diamond = hostile.
 * Echelon marks sit above the frame:  II = battalion · I = company.
 */

// ----- individual symbols (each separately importable) -----
export const FriendlyUnit: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <rect x="18" y="40" width="64" height="38" fill="none" stroke="currentColor" strokeWidth="6"/>
      <line x1="44" y1="24" x2="44" y2="36" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="56" y1="24" x2="56" y2="36" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);
export const HostileUnit: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <path d="M50 28 L78 56 L50 84 L22 56 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter"/>
      <line x1="44" y1="11" x2="44" y2="22" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="56" y1="11" x2="56" y2="22" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);
export const BattalionCOC: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <rect x="24" y="46" width="54" height="34" fill="none" stroke="currentColor" strokeWidth="6"/>
      <line x1="24" y1="46" x2="24" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <path d="M24 21 L42 27 L24 33 Z" fill="currentColor" stroke="none"/>
      <line x1="47" y1="34" x2="47" y2="44" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <line x1="59" y1="34" x2="59" y2="44" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);
export const CompanyCOC: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <rect x="24" y="46" width="54" height="34" fill="none" stroke="currentColor" strokeWidth="6"/>
      <line x1="24" y1="46" x2="24" y2="20" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <path d="M24 21 L42 27 L24 33 Z" fill="currentColor" stroke="none"/>
      <line x1="53" y1="34" x2="53" y2="44" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);
export const EngineerUnit: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <rect x="18" y="42" width="64" height="38" fill="none" stroke="currentColor" strokeWidth="6"/>
      <path d="M30 74 V58 H42 V66 H58 V58 H70 V74" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeLinecap="butt"/>
      <line x1="44" y1="26" x2="44" y2="38" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <line x1="56" y1="26" x2="56" y2="38" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);
export const BattalionAidStation: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <rect x="28" y="28" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="6"/>
      <path d="M45 38 H55 V46 H63 V54 H55 V62 H45 V54 H37 V46 H45 Z" fill="var(--accent-red)" stroke="none"/>
  </svg>
);
export const InterlockingFire: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <line x1="24" y1="82" x2="52" y2="30" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <line x1="24" y1="82" x2="84" y2="58" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <line x1="76" y1="82" x2="48" y2="30" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <line x1="76" y1="82" x2="16" y2="58" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="24" cy="80" r="4.5" fill="currentColor"/>
      <circle cx="76" cy="80" r="4.5" fill="currentColor"/>
  </svg>
);
export const ConcertinaWire: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <line x1="14" y1="60" x2="86" y2="60" stroke="currentColor" strokeWidth="3"/>
      <circle cx="24" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="5"/>
      <circle cx="38" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="5"/>
      <circle cx="52" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="5"/>
      <circle cx="66" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="5"/>
      <circle cx="80" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="5"/>
  </svg>
);
export const ObstacleMines: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <line x1="19" y1="43" x2="37" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="37" y1="43" x2="19" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="41" y1="43" x2="59" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="59" y1="43" x2="41" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="63" y1="43" x2="81" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <line x1="81" y1="43" x2="63" y2="61" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
  </svg>
);
export const RouteMSR: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <line x1="14" y1="50" x2="66" y2="50" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <path d="M84 50 L62 39 L62 61 Z" fill="currentColor" stroke="none"/>
  </svg>
);
export const Checkpoint: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="6"/>
      <circle cx="50" cy="50" r="5.5" fill="currentColor"/>
  </svg>
);
export const UnfordableStream: React.FC = () => (
  <svg viewBox="0 0 100 100" className="sym-glyph" aria-hidden="true" focusable="false">
      <path d="M16 60 C30 72 40 40 54 52 S78 30 86 36" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
      <path d="M16 70 C30 82 40 50 54 62 S78 40 86 46" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

// ----- registry for grid rendering -----
export interface MapSymbol {
  key: string;
  name: string;
  nomen: string;
  Glyph: React.FC;
}

export const MAP_SYMBOLS: MapSymbol[] = [
  { key: "FriendlyUnit", name: "FRIENDLY", nomen: "maneuver unit", Glyph: FriendlyUnit },
  { key: "HostileUnit", name: "HOSTILE", nomen: "enemy unit", Glyph: HostileUnit },
  { key: "BattalionCOC", name: "BN COC", nomen: "Bn CP / HQ", Glyph: BattalionCOC },
  { key: "CompanyCOC", name: "CO COC", nomen: "Co CP / HQ", Glyph: CompanyCOC },
  { key: "EngineerUnit", name: "ENGINEER", nomen: "construction/cbt", Glyph: EngineerUnit },
  { key: "BattalionAidStation", name: "AID STN", nomen: "BAS · Role 1", Glyph: BattalionAidStation },
  { key: "InterlockingFire", name: "INTERLOCK", nomen: "crew-served · FPF", Glyph: InterlockingFire },
  { key: "ConcertinaWire", name: "WIRE", nomen: "concertina", Glyph: ConcertinaWire },
  { key: "ObstacleMines", name: "MINES", nomen: "obstacle/minefield", Glyph: ObstacleMines },
  { key: "RouteMSR", name: "MSR", nomen: "route · ASR", Glyph: RouteMSR },
  { key: "Checkpoint", name: "CHECKPOINT", nomen: "CP / TCP", Glyph: Checkpoint },
  { key: "UnfordableStream", name: "STREAM", nomen: "unfordable · water", Glyph: UnfordableStream }
];

// ----- one card -----
export const SymbolCard: React.FC<{ sym: MapSymbol }> = ({ sym }) => {
  const { Glyph, name, nomen } = sym;
  return (
    <div className="sym-card">
      <div className="sym-frame">
        <Glyph />
      </div>
      <div className="sym-name">{name}</div>
      <div className="sym-nomen">{nomen}</div>
    </div>
  );
};

// ----- the 4x3 grid section, drop into the TOOLS tab -----
export const MapSymbolsSection: React.FC = () => (
  <section className="sym-section">
    <div className="section-label">MAP SYMBOLS</div>
    <div className="sym-grid">
      {MAP_SYMBOLS.map((s) => (
        <SymbolCard key={s.key} sym={s} />
      ))}
    </div>
    <p className="sym-foot">
      Reference only &middot; simplified NATO / APP-6 symbology. Affiliation is
      shape, not color &mdash; rectangle friendly, diamond hostile. Echelon above
      the frame: <strong>II</strong> battalion, <strong>I</strong> company.
    </p>
  </section>
);

export default MapSymbolsSection;
