/** Acronyms and terms used in the course OPORD and this app, with plain-English meanings. */
export interface GlossaryEntry {
  term: string;
  expansion?: string;
  def: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: '5 S’s & T',
    expansion: 'Search, Silence, Segregate, Safeguard, Speed, Tag',
    def: 'EPW/detainee handling sequence. Tag with DD Form 2745 and link confiscated items to the tag number.',
  },
  {
    term: '9-line',
    expansion: 'MEDEVAC request',
    def: 'Nine-line casualty evacuation request. Lines 1–5 get the aircraft moving; 6–9 can follow en route.',
  },
  {
    term: 'ABCC',
    expansion: 'Advanced Base Construction Company',
    def: 'A Seabee company task-organized to build and sustain an expeditionary advanced base.',
  },
  {
    term: 'ACU',
    expansion: 'Assault Craft Unit',
    def: 'Navy unit that moves vehicles and equipment ship-to-shore.',
  },
  {
    term: 'Adjacent unit',
    def: 'Same higher headquarters, different mission, operating near you.',
  },
  {
    term: 'ADR',
    expansion: 'Airfield Damage Repair',
    def: 'Rapid repair of a runway to minimum operating standards.',
  },
  {
    term: 'AM2',
    def: 'Aluminum airfield matting laid to make an expeditionary runway or parking surface.',
  },
  {
    term: 'AO',
    expansion: 'Area of Operations',
    def: 'The ground a commander is assigned and responsible for.',
  },
  { term: 'Attachment', def: 'A unit that belongs to you for tasking for a stated period.' },
  {
    term: 'Avenue of approach',
    def: 'A route an attacking force (friendly or enemy) can use to reach an objective.',
  },
  {
    term: 'AXP',
    expansion: 'Ambulance Exchange Point',
    def: 'Where casualties are handed from one evacuation vehicle to another.',
  },
  {
    term: 'BAMCIS',
    expansion:
      'Begin planning, Arrange recon, Make recon, Complete the plan, Issue the order, Supervise',
    def: 'The Marine Corps troop-leading steps.',
  },
  {
    term: 'BAS',
    expansion: 'Battalion Aid Station',
    def: 'Role 1 care: corpsmen and a medical officer, no surgery.',
  },
  {
    term: 'Battlespace overview',
    def: 'The tactical picture around your unit, briefed early in the Situation paragraph.',
  },
  { term: 'BLS', expansion: 'Beach Landing Site', def: 'Where landing craft put forces ashore.' },
  {
    term: 'BMNT / EENT',
    expansion: 'Begin Morning / End Evening Nautical Twilight',
    def: 'First and last usable light — the edges of the “light data” you brief.',
  },
  {
    term: 'BPT',
    expansion: 'Be Prepared To',
    def: 'A contingency task you plan for but may not be ordered to execute.',
  },
  {
    term: 'BW / EW / CE / CS',
    expansion: 'Begins With, Ends With, Critical Event, Conditions Set',
    def: 'The four lines that define each part of the concept of operations.',
  },
  {
    term: 'C2',
    expansion: 'Command and Control',
    def: 'How a commander directs forces — people, comms and procedures.',
  },
  {
    term: 'CAAT',
    expansion: 'Combined Anti-Armor Team',
    def: 'Vehicle-mounted heavy weapons team; in the course exercise it escorts the convoy.',
  },
  {
    term: 'CAS',
    expansion: 'Close Air Support',
    def: 'Aircraft attacking targets near friendly forces.',
  },
  {
    term: 'CASEVAC',
    expansion: 'Casualty Evacuation',
    def: 'Moving casualties on whatever platform is available, without dedicated en-route medical care. Compare MEDEVAC.',
  },
  {
    term: 'CASS sheet',
    expansion: 'Construction Activity Summary Sheet',
    def: 'Seabee planning document for a construction activity: crew, equipment, materials, durations.',
  },
  {
    term: 'CCIR',
    expansion: "Commander's Critical Information Requirements",
    def: 'What the commander must know to make decisions (PIR about the enemy, FFIR about friendly forces).',
  },
  {
    term: 'CCP',
    expansion: 'Casualty Collection Point',
    def: 'Where casualties are gathered, triaged, treated and staged for evacuation.',
  },
  {
    term: 'CEOI',
    expansion: 'Communications-Electronics Operating Instructions',
    def: 'The frequencies, call signs and signals for an operation (the course calls it the execution checklist).',
  },
  {
    term: 'CESE',
    expansion: 'Civil Engineer Support Equipment',
    def: 'Seabee heavy equipment — dozers, graders, dump trucks, cranes.',
  },
  {
    term: 'Challenge & pass',
    def: 'Password system for identifying friendly forces: primary words, an alternate number pair that adds to the day’s number, a running word said three times, and a night IR flash sequence.',
  },
  {
    term: 'COA',
    expansion: 'Course of Action',
    def: 'One possible way to accomplish the mission.',
  },
  {
    term: 'COC',
    expansion: 'Combat Operations Center',
    def: 'The unit headquarters where the fight is tracked and controlled.',
  },
  {
    term: 'COG / CV',
    expansion: 'Center of Gravity / Critical Vulnerability',
    def: "The enemy's greatest source of strength, and what that strength depends on that you can attack.",
  },
  { term: 'Concealment', def: 'Protection from observation. It does not stop bullets.' },
  {
    term: 'CONOPS',
    expansion: 'Concept of Operations',
    def: 'How the operation unfolds, part by part.',
  },
  {
    term: 'Conditions set',
    def: 'An observable sign that the force is ready to move to the next part of the operation.',
  },
  {
    term: 'Cover',
    def: 'Protection from fire. Cover usually also conceals; concealment rarely covers.',
  },
  {
    term: 'Critical event',
    def: 'The single thing that must happen for a part of the operation to succeed.',
  },
  { term: 'Detachment', def: 'A unit that no longer belongs to you for the operation.' },
  {
    term: 'DOS',
    expansion: 'Days of Supply',
    def: 'How many days a stock of food, water, fuel or ammo lasts.',
  },
  {
    term: 'DRAW-D',
    expansion: 'Defend, Reinforce, Attack, Withdraw, Delay',
    def: 'Enemy capabilities, each rated most likely / likely / unlikely — only one can be most likely.',
  },
  {
    term: 'DS / GS',
    expansion: 'Direct Support / General Support',
    def: 'DS: dedicated to a unit, but higher keeps tasking authority. GS: available to all, served by priority.',
  },
  {
    term: 'DTG',
    expansion: 'Date-Time Group',
    def: 'Day, hour, minute, time zone, month, year — e.g. 212319Z OCT 26.',
  },
  {
    term: 'EAB / EABO',
    expansion: 'Expeditionary Advanced Base (Operations)',
    def: 'A temporary forward base — runway, fuel, shelter — that supports forces in contested areas.',
  },
  {
    term: 'EMLCOA',
    expansion: "Enemy's Most Likely Course of Action",
    def: 'One narrative paragraph that marries SALUTE and DRAW-D. (The course example order also says EMPCOA, “most probable”.)',
  },
  { term: 'EN / FR', expansion: 'Enemy / Friendly', def: 'Standard shorthand in orders.' },
  {
    term: 'Endstate',
    def: 'What the situation looks like when the mission is complete — for friendly forces, the enemy, terrain and populace.',
  },
  {
    term: 'EPW',
    expansion: 'Enemy Prisoner of War',
    def: 'Captured enemy combatant. Handled with the 5 S’s and T.',
  },
  {
    term: 'Essential task',
    def: 'A specified or implied task that must be done or the mission fails — usually the main effort’s task.',
  },
  {
    term: 'Expectant',
    def: 'Triage category for casualties unlikely to survive with the resources available. Not dead — comfort care, and re-triage when resources allow.',
  },
  {
    term: 'FPF / FPL',
    expansion: 'Final Protective Fire / Line',
    def: 'A pre-planned barrier of fire across the front of a position — the last-resort defensive fire.',
  },
  {
    term: 'FRAGORD',
    expansion: 'Fragmentary Order',
    def: 'A change to an existing order; it covers only what changed.',
  },
  {
    term: 'G-M angle',
    expansion: 'Grid-magnetic angle',
    def: 'The angle between grid north and magnetic north. Converts a compass bearing to a map bearing.',
  },
  {
    term: 'HERO',
    def: 'Brevity many units use for killed in action — as in the course exercise report “(# by wound type)/HERO” (WIA by wound type / KIA).',
  },
  { term: 'Higher', def: 'Your headquarters, and its headquarters (you brief two levels up).' },
  {
    term: 'HLZ',
    expansion: 'Helicopter Landing Zone',
    def: 'An area with one or more landing points where helicopters land.',
  },
  {
    term: 'HMH / HMLA',
    expansion: 'Marine Heavy Helicopter / Light Attack Helicopter Squadron',
    def: 'CH-53 squadron / UH-1Y and AH-1Z squadron.',
  },
  {
    term: 'Immediate action',
    def: 'A drill executed without an order when something happens — contact, IED, casualty, lost comms.',
  },
  {
    term: 'Implied task',
    def: 'Not stated in the order but necessary to accomplish it. Brief only what isn’t covered by training — except safety.',
  },
  { term: 'IOT', expansion: 'In Order To', def: 'Introduces the purpose of a task — the “why”.' },
  { term: 'IVO', expansion: 'In the Vicinity Of', def: 'Near a grid or named location.' },
  {
    term: 'Key terrain',
    def: 'Ground that gives a marked advantage to whoever holds it. Say what it is, where, what it provides, and why it matters.',
  },
  { term: 'KIA / WIA', expansion: 'Killed / Wounded in Action', def: 'Casualty status terms.' },
  {
    term: 'KOCOA(W)',
    expansion:
      'Key terrain, Observation & fields of fire, Cover & concealment, Obstacles, Avenues of approach (+ Weather)',
    def: 'The terrain analysis framework.',
  },
  {
    term: 'LCT',
    expansion: 'Littoral Combat Team',
    def: 'The infantry-battalion-based team of a Marine Littoral Regiment.',
  },
  {
    term: 'LP / OP',
    expansion: 'Listening Post / Observation Post',
    def: 'Forward security positions that give early warning.',
  },
  {
    term: 'Main effort (ME)',
    def: 'The element whose task is most critical to mission success at that time. It gets priority of support.',
  },
  {
    term: 'MASCAL',
    expansion: 'Mass Casualty',
    def: 'More casualties than the medical resources on hand can handle at once.',
  },
  {
    term: 'MCPP',
    expansion: 'Marine Corps Planning Process',
    def: 'Staff planning steps: problem framing, COA development, wargaming, comparison & decision, orders development, transition.',
  },
  {
    term: 'MEDEVAC',
    expansion: 'Medical Evacuation',
    def: 'Evacuation on a dedicated, medically staffed platform with en-route care. Compare CASEVAC.',
  },
  {
    term: 'METT-T',
    expansion: 'Mission, Enemy, Terrain & weather, Troops & support available, Time available',
    def: 'The mission analysis framework.',
  },
  {
    term: 'MHP / THP',
    expansion: 'Mission Has Priority / Time Has Priority',
    def: 'Ends a tasking statement: finish the task even if late, or meet the time even if imperfect.',
  },
  {
    term: 'MIST',
    expansion: 'Mechanism, Injuries, Signs & symptoms, Treatment',
    def: 'Casualty handoff report sent after the 9-line (Z-MIST adds the roster/zap number).',
  },
  {
    term: 'MLR',
    expansion: 'Marine Littoral Regiment',
    def: 'Marine regiment built for operations on islands and coastlines.',
  },
  {
    term: 'MSR / ASR',
    expansion: 'Main / Alternate Supply Route',
    def: 'The primary and backup routes for moving supplies.',
  },
  { term: 'NLT', expansion: 'No Later Than', def: 'A deadline.' },
  {
    term: 'NO GO criteria',
    def: 'Conditions under which the operation will not be executed (e.g. loss of the aviation asset, winds over a limit).',
  },
  {
    term: 'NVG / NOD',
    expansion: 'Night Vision Goggles / Night Observation Device',
    def: 'Night optics.',
  },
  {
    term: 'Obstacle',
    def: 'Anything that stops, slows or diverts movement — natural (streams, steep ground) or man-made (wire, mines, ditches).',
  },
  { term: 'OPORD', expansion: 'Operation Order', def: 'The full five-paragraph order.' },
  {
    term: 'ORP',
    expansion: 'Objective Rally Point',
    def: 'The last covered and concealed position before the objective.',
  },
  {
    term: 'OSMEAC',
    expansion: 'Orientation, Situation, Mission, Execution, Admin & Logistics, Command & Signal',
    def: 'The order format: Orientation, then the five paragraphs.',
  },
  {
    term: 'PACE',
    expansion: 'Primary, Alternate, Contingency, Emergency',
    def: 'Backup plan for communications (or evacuation): what you use when the first method fails.',
  },
  {
    term: 'Part / phase / stage',
    def: 'A chunk of the operation with a clear beginning and end. The course instructors use “parts” at company level.',
  },
  {
    term: 'PCC / PCI',
    expansion: 'Pre-Combat Checks / Inspections',
    def: 'Checks of gear and inspections of people before a mission.',
  },
  {
    term: 'PID',
    expansion: 'Positive Identification',
    def: 'Reasonable certainty that a target is a legitimate one — required by the ROE before deadly force.',
  },
  {
    term: 'POI',
    expansion: 'Point of Injury',
    def: 'Where the casualty was hurt — the first node of the evacuation chain.',
  },
  {
    term: 'Precedence',
    expansion: 'Evacuation precedence',
    def: 'How fast a casualty must be evacuated: Urgent, Urgent-Surgical, Priority, Routine, Convenience (9-line Line 3).',
  },
  {
    term: 'Priorities of work',
    def: 'The order in which tasks get done after occupying a position, with deadlines. The defensive-ops class used SAFE-SOC.',
  },
  {
    term: 'QRF',
    expansion: 'Quick Reaction Force',
    def: 'A ready element that reinforces or responds on short notice.',
  },
  {
    term: 'RIP',
    expansion: 'Relief in Place',
    def: 'One unit takes over a position or mission from another.',
  },
  {
    term: 'ROE',
    expansion: 'Rules of Engagement',
    def: 'When deadly force is authorized. Dictated by higher — copy them, don’t invent them.',
  },
  {
    term: 'Role 1–4',
    expansion: 'Roles of medical care',
    def: 'Role 1 BAS / corpsman care; Role 2 forward resuscitation and damage-control surgery (STP, FRSS); Role 3 theater hospital; Role 4 definitive care in CONUS.',
  },
  { term: 'RTO', expansion: 'Radio Telephone Operator', def: 'Whoever runs the radio.' },
  {
    term: 'SAFE-SOC',
    expansion:
      'Security, Automatic weapons, Fields of fire, Entrenchment, Supplementary positions, Obstacles, Camouflage',
    def: 'Priority of work in the defense, from the defensive-ops class.',
  },
  {
    term: 'SALUTE',
    expansion: 'Size, Activity, Location, Unit, Time, Equipment',
    def: 'How to describe an enemy force. Bulletize it down the page when briefing.',
  },
  {
    term: 'Scheme of maneuver',
    def: 'How elements move and fight in each part. Use anonymous roles (main effort, supporting effort one) — unit names come in the tasks.',
  },
  { term: 'SITREP', expansion: 'Situation Report', def: 'A routine status report.' },
  {
    term: 'SMEAC',
    expansion: 'Situation, Mission, Execution, Admin & Logistics, Command & Signal',
    def: 'The five paragraphs of an order.',
  },
  {
    term: 'SOP',
    expansion: 'Standing Operating Procedure',
    def: 'How the unit always does something unless the order changes it.',
  },
  {
    term: 'SP / RP',
    expansion: 'Start Point / Release Point',
    def: 'Where a movement begins / where elements break away to their tasks.',
  },
  {
    term: 'Specified task',
    def: 'A task stated in the order. Look everywhere: tasks, coordinating instructions, admin and log, annexes.',
  },
  {
    term: 'sUAS',
    expansion: 'small Unmanned Aircraft System',
    def: 'Small drones — a reason to conceal and move the COC, CCP and medical sites.',
  },
  { term: 'Supporting effort (SE)', def: 'An element whose task enables the main effort.' },
  {
    term: 'Supporting unit',
    def: 'Same higher, supporting your mission (aviation, fires, sealift).',
  },
  {
    term: 'TACON',
    expansion: 'Tactical Control',
    def: 'Authority to direct a unit’s movement and tasks for a mission, short of full command.',
  },
  {
    term: 'Tasking statement',
    def: '“[Unit], you are the [main effort]. Upon [trigger], [task] [where] IOT [purpose]. [MHP/THP]” — one per element, per part.',
  },
  {
    term: 'TCCC',
    expansion: 'Tactical Combat Casualty Care',
    def: 'The battlefield trauma care standard (MARCH: massive hemorrhage, airway, respiration, circulation, hypothermia/head).',
  },
  {
    term: 'TCM',
    expansion: 'Tactical Control Measure',
    def: 'Named points, lines and areas that control the operation — objectives, phase lines, checkpoints, boundaries.',
  },
  {
    term: 'Terrain model',
    def: 'A scale model of the ground built so everyone can see the plan. The course grades briefing from one.',
  },
  {
    term: 'Time hack',
    def: 'Synchronizing watches at the end of the brief: “The time will be 0912 in 10 seconds… 5, 4, 3, 2, 1, HACK.”',
  },
  {
    term: 'Triage (IDME)',
    expansion: 'Immediate, Delayed, Minimal, Expectant',
    def: 'Who gets treated first. Separate from evacuation precedence and from role of care.',
  },
  {
    term: 'TRP',
    expansion: 'Target Reference Point',
    def: 'An easily recognized point used to orient and control fires.',
  },
  {
    term: 'WARNORD',
    expansion: 'Warning Order',
    def: 'Advance notice of a mission so subordinates can start preparing.',
  },
];
