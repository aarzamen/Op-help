/**
 * EULC "Issue a Combat Order — Performance Evaluation Checklist" (terrain-model brief).
 * Structure and prompts follow the instructors' checklist; point values are a Feb 2026
 * reconstruction of the sheet (100 total). Classes revise their sheets — check yours.
 */
export interface RubricItem {
  id: string;
  label: string;
  prompt?: string;
  pts: number;
}

export interface RubricSection {
  id: string;
  title: string;
  /** Who usually briefs it under the course's officer / enlisted split. */
  briefer: 'officer' | 'enlisted' | 'everyone';
  items: RubricItem[];
}

export const RUBRIC: RubricSection[] = [
  {
    id: 'prep',
    title: 'PREPARATION',
    briefer: 'officer',
    items: [
      { id: 'prep-a', label: 'Roll call by element', pts: 1 },
      { id: 'prep-b', label: 'Terrain model legend & magnetic north', pts: 2 },
    ],
  },
  {
    id: 'orient',
    title: 'ORIENTATION',
    briefer: 'officer',
    items: [
      { id: 'or-a', label: 'General overview', prompt: 'Strategic & operational picture', pts: 2 },
      {
        id: 'or-b',
        label: 'Tactical control measures',
        prompt: 'Title, type, physical description; grid on a board, the model, or both',
        pts: 2,
      },
      {
        id: 'or-k',
        label: 'Key terrain',
        prompt: 'What is it? What does it provide? Why is it important to the mission?',
        pts: 1,
      },
      {
        id: 'or-o',
        label: 'Observation & fields of fire',
        prompt: 'How far can one see? Does it change?',
        pts: 1,
      },
      {
        id: 'or-c',
        label: 'Cover & concealment',
        prompt: 'What is it? Where is it? Is it useful? How?',
        pts: 1,
      },
      {
        id: 'or-oa',
        label: 'Obstacles & avenues of approach',
        prompt: 'Type? Direction? Usefulness? Purpose? — friendly and enemy',
        pts: 2,
      },
      {
        id: 'or-w',
        label: 'Weather',
        prompt:
          'Analysis; effects on personnel, weapons, equipment, CESE; 3 days of SR, SS, BMNT, EENT, temps, precip, illum',
        pts: 3,
      },
    ],
  },
  {
    id: 'sit',
    title: '1. SITUATION',
    briefer: 'officer',
    items: [
      { id: 'si-to', label: 'Task organization', prompt: 'Who belongs to whom?', pts: 1 },
      { id: 'si-bo', label: 'Battlespace overview', prompt: 'The tactical picture', pts: 1 },
      {
        id: 'si-en',
        label: 'Enemy: SALUTE + DRAW-D',
        prompt: "Your enemy, not higher's. Capable? Likely? What will it look like against you?",
        pts: 6,
      },
      { id: 'si-em', label: 'EMLCOA', prompt: 'SALUTE + DRAW-D = EMLCOA', pts: 2 },
      {
        id: 'si-fr',
        label: 'Friendly: higher (2 levels), adjacent, supporting',
        prompt: 'Unit & call sign, location, task/mission, intent',
        pts: 5,
      },
      {
        id: 'si-ad',
        label: 'Attachments & detachments',
        prompt: 'Who? Effective date & time?',
        pts: 2,
      },
    ],
  },
  {
    id: 'mis',
    title: '2. MISSION',
    briefer: 'officer',
    items: [{ id: 'mi', label: "Higher's verbatim priority tasking statement to you", pts: 5 }],
  },
  {
    id: 'exe',
    title: '3. EXECUTION',
    briefer: 'officer',
    items: [
      {
        id: 'ex-ci',
        label: "Commander's intent",
        prompt:
          'Purpose, method, EN center of gravity, EN critical vulnerability, exploitation, endstate (FR & EN)',
        pts: 6,
      },
      {
        id: 'ex-ph',
        label: 'Scheme of maneuver — each part',
        prompt: 'Begins with, ends with, critical events',
        pts: 4,
      },
      {
        id: 'ex-fm',
        label: 'Form / direction / order of movement',
        prompt: '"Walk the dog" for each sequence — anonymous elements (ME, SE1, SE2)',
        pts: 2,
      },
      {
        id: 'ex-tk',
        label: "Tasks — 5 W's",
        prompt:
          'One tasking statement per subordinate element, per part: unit, conditions set, task, purpose',
        pts: 8,
      },
      {
        id: 'ex-ao',
        label: 'Actions on the objective & priorities of work',
        prompt: 'Site occupation, camp layout; what order, how soon',
        pts: 2,
      },
      {
        id: 'ex-ia',
        label: 'Immediate actions & NO GO criteria',
        prompt:
          'Plus specific instructions, rehearsals, ROE, changes to SOP, lost/missing, reports, timeline',
        pts: 4,
      },
    ],
  },
  {
    id: 'al',
    title: '4. ADMIN & LOGISTICS',
    briefer: 'enlisted',
    items: [
      {
        id: 'al-cas',
        label: 'Casualty evacuation',
        prompt:
          'CCPs & HLZs, corpsmen by part, reporting, handling, evacuation timeline by echelon of care, MASCAL, enemy casualties',
        pts: 4,
      },
      {
        id: 'al-epw',
        label: 'EPWs & detainees',
        prompt: "5 S's & T, reporting, holding area, handoff (5 W's by part)",
        pts: 2,
      },
      {
        id: 'al-cw',
        label: 'Chow & water',
        prompt: 'Initial issue, amount on each individual (on & off camp), resupply',
        pts: 2,
      },
      {
        id: 'al-am',
        label: 'Ammunition',
        prompt: 'Initial issue by unit, amount maintained, resupply',
        pts: 2,
      },
      {
        id: 'al-se',
        label: 'Special equipment',
        prompt: "CESE, tools — type and control (who's in charge, who can request)",
        pts: 2,
      },
      { id: 'al-cm', label: 'Construction materials', prompt: 'Type and control', pts: 2 },
      { id: 'al-fb', label: 'Fuel & batteries', prompt: 'Initial issue by unit; resupply', pts: 2 },
    ],
  },
  {
    id: 'cs',
    title: '5. COMMAND & SIGNAL',
    briefer: 'enlisted',
    items: [
      {
        id: 'cs-sig',
        label: 'Signal',
        prompt:
          'Freqs/channels, call signs, PACE (account for pyro), no-comms plan, challenge & pass D-Day to D+3',
        pts: 5,
      },
      {
        id: 'cs-cmd',
        label: 'Command',
        prompt: 'Succession of command and key leader locations, by part',
        pts: 2,
      },
    ],
  },
  {
    id: 'gen',
    title: 'GENERAL — DELIVERY',
    briefer: 'everyone',
    items: [
      { id: 'ge-q', label: 'Limits questions to after Orientation and the end', pts: 2 },
      { id: 'ge-term', label: 'Clear, doctrinal terminology', pts: 2 },
      { id: 'ge-detail', label: 'Avoids unnecessary detail, stays on topic', pts: 2 },
      { id: 'ge-aff', label: 'Uses the affirmative form', pts: 2 },
      { id: 'ge-qual', label: 'Avoids qualified directives', pts: 2 },
      { id: 'ge-auth', label: 'Authoritative and confident', pts: 2 },
      { id: 'ge-time', label: 'Full order in 30–60 minutes', pts: 2 },
    ],
  },
];

export const sectionPts = (s: RubricSection) => s.items.reduce((n, i) => n + i.pts, 0);
export const RUBRIC_TOTAL = RUBRIC.reduce((n, s) => n + sectionPts(s), 0);
