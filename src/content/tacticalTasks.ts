/**
 * Tactical task verbs — plain-English gists of the FM 3-90-1 / MCRP 1-10.2 definitions
 * ("Operational Terms and Graphics"). Words mean things: check the exact wording in the
 * manual before you rely on a nuance.
 */
export interface TacticalTask {
  verb: string;
  group: 'Friendly action' | 'Effect on enemy' | 'Security' | 'Seabee / support';
  gist: string;
}

export const TACTICAL_TASKS: TacticalTask[] = [
  // actions by friendly forces
  {
    verb: 'occupy',
    group: 'Friendly action',
    gist: 'Move into an area so you can control it — no enemy opposition.',
  },
  {
    verb: 'secure',
    group: 'Friendly action',
    gist: 'Gain possession of a position or terrain feature, with or without force, and prevent its destruction or loss to the enemy. Implies 360° security, crew-served placement, interlocking fires.',
  },
  {
    verb: 'seize',
    group: 'Friendly action',
    gist: 'Take possession of a designated area using overwhelming force.',
  },
  {
    verb: 'clear',
    group: 'Friendly action',
    gist: 'Remove all enemy forces and eliminate organized resistance in an assigned area.',
  },
  {
    verb: 'retain',
    group: 'Friendly action',
    gist: 'Make sure terrain you already control stays free of enemy occupation or use.',
  },
  {
    verb: 'control',
    group: 'Friendly action',
    gist: 'Keep physical influence over an area to deny it to the enemy or set conditions for friendly operations.',
  },
  {
    verb: 'support by fire',
    group: 'Friendly action',
    gist: 'Move to a position to engage the enemy by direct fire in support of another maneuvering force.',
  },
  {
    verb: 'breach',
    group: 'Friendly action',
    gist: 'Break through or open a passage through an obstacle, minefield, defense, or fortification.',
  },
  {
    verb: 'bypass',
    group: 'Friendly action',
    gist: 'Maneuver around an obstacle, position, or enemy force to keep momentum — deliberately avoiding combat.',
  },
  // effects on enemy forces
  {
    verb: 'block',
    group: 'Effect on enemy',
    gist: 'Deny the enemy access to an area or stop its advance along an avenue of approach.',
  },
  {
    verb: 'canalize',
    group: 'Effect on enemy',
    gist: 'Restrict enemy movement to a narrow zone using terrain, obstacles, fires, or maneuver.',
  },
  {
    verb: 'contain',
    group: 'Effect on enemy',
    gist: 'Stop, hold, or surround enemy forces so they cannot withdraw any part for use elsewhere.',
  },
  {
    verb: 'defeat',
    group: 'Effect on enemy',
    gist: 'The enemy has lost the physical means or the will to fight, temporarily or permanently.',
  },
  {
    verb: 'destroy',
    group: 'Effect on enemy',
    gist: 'Physically render an enemy force combat-ineffective until it is reconstituted.',
  },
  {
    verb: 'disrupt',
    group: 'Effect on enemy',
    gist: 'Upset the enemy formation or tempo, interrupt its timetable, or force a piecemeal or premature commitment.',
  },
  {
    verb: 'fix',
    group: 'Effect on enemy',
    gist: 'Prevent the enemy from moving any part of its force from a location for a period of time.',
  },
  {
    verb: 'interdict',
    group: 'Effect on enemy',
    gist: "Prevent, disrupt, or delay the enemy's use of an area or route.",
  },
  {
    verb: 'isolate',
    group: 'Effect on enemy',
    gist: 'Seal the enemy off — physically and psychologically — from support, freedom of movement, and other enemy forces.',
  },
  {
    verb: 'neutralize',
    group: 'Effect on enemy',
    gist: 'Render enemy personnel or materiel incapable of interfering with a particular operation.',
  },
  {
    verb: 'suppress',
    group: 'Effect on enemy',
    gist: 'Temporarily degrade a force or weapon below the level it needs to accomplish its mission.',
  },
  {
    verb: 'turn',
    group: 'Effect on enemy',
    gist: 'Force an enemy element from one avenue of approach or movement corridor to another.',
  },
  // security
  {
    verb: 'screen',
    group: 'Security',
    gist: 'Provide early warning to the protected force — observe and report.',
  },
  {
    verb: 'guard',
    group: 'Security',
    gist: 'Protect the main body by fighting to gain time while also observing and reporting.',
  },
  // course-accepted support verbs
  {
    verb: 'establish',
    group: 'Seabee / support',
    gist: 'Instructor-accepted for construction missions ("establish an EAB", "establish the COC"). "Build" is not a tactical task — "establish" and "occupy" are.',
  },
  {
    verb: 'maintain',
    group: 'Seabee / support',
    gist: 'Keep a site, route, or capability operating (used in the course exercise for follow-on phases).',
  },
];

/** Purpose ("IOT …") verbs from the same reference — your task either causes or enables. */
export const PURPOSE_VERBS = [
  'allow',
  'cause',
  'create',
  'deceive',
  'deny',
  'divert',
  'enable',
  'envelop',
  'influence',
  'open',
  'prevent',
  'protect',
  'support',
  'surprise',
];
