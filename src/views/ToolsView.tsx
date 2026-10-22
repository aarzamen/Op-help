import { Block, Info, LeafItem, SectionLabel, SubBlock } from '../components/ui';
import {
  IconBoundary,
  IconChecklist,
  IconFireControl,
  IconObjective,
  IconOrders,
  IconPhaseLine,
  IconWire,
} from '../components/icons';
import { NotesBlock } from '../components/notes';
import EditableChecklist from '../components/EditableChecklist';
import { CHECKLIST_KEYS } from '../lib/checklists';
import MapSymbolsSection from '../MapSymbols';

/** Field reference: supervision checklists, order types, control measures, symbols. */
const ToolsView = () => (
  <div>
    <SectionLabel>SUPERVISE · PCC / PCI</SectionLabel>
    <Block
      theme="execution"
      letter={<IconChecklist />}
      name="PCC / PCI"
      desc="Pre-combat checks (gear) and inspections (people)"
    >
      <Info>
        <strong>PCC</strong> checks <em>gear</em> — accountability and function.{' '}
        <strong>PCI</strong> inspects <em>people</em> — knowledge, mental state, readiness. Edit any
        list to fit the mission; edits export with the TOOLS PDF.
      </Info>
      <SubBlock theme="execution" letter="C" name="CONVOY">
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.convoyGear}
          title="Gear (PCC)"
          initialItems={[
            'Vehicles dispatched, fluids/tires checked, no deadline issues; recovery vehicle and tow straps/chains staged',
            'Fuel topped off, jerry cans secured',
            'Comms — radios up, fills loaded, PACE plan set, spare batteries; check-in with COC before SP',
            'Blue Force Tracker / nav up, strip map and route loaded',
            'Weapons cleaned, function-checked, accountable by serial; crew-served mounted with correct ammo and headspace/timing set',
            'Med gear — IFAKs on every body, vehicle trauma kit / litter staged, CASEVAC vehicle identified',
            'Load secured, blocking/bracing in place, nothing shifting or protruding; hazmat documented if carried',
            'Fire extinguishers, spare tire, basic tools per vehicle',
          ]}
        />
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.convoyPeople}
          title="People (PCI)"
          initialItems={[
            'Every driver/A-driver/gunner briefed on route, order of march, speeds, intervals, and the SP/RP times',
            'Actions-on rehearsed — contact, IED/blast, vehicle down, CASEVAC, breakdown, separation from convoy',
            'Everyone can state the mission and the immediate-action drills cold',
            'Bump plan and recovery plan known — who cross-loads where if a vehicle drops',
            'Convoy commander and assistant identified; succession known',
            'Challenge/password and far/near recognition signals known',
            'Hydration/chow status good; heat category and work/rest understood',
            'PPE worn — IBA/plates, helmet, eye pro, hearing pro, gloves, seatbelts',
            'Sensitive items inventoried before SP',
          ]}
        />
      </SubBlock>
      <SubBlock theme="execution" letter="M" name="EXECUTING A MISSION">
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.missionGear}
          title="Gear (PCC)"
          initialItems={[
            "CESE for the task dispatched and PMCS'd; MHE/crane inspected, rigging gear (slings, shackles) inspected and rated",
            "Class IV staged and inventoried against the BOM — don't roll out short on materials",
            'Tools accounted for, power/fuel for equipment confirmed',
            'Comms up to higher; PACE set',
            "Weapons and ammo accountable; security element's gear checked",
            "Corpsman's bag stocked, CASEVAC plan and 9-line staged, nearest MTF known",
            'Site safety gear — barricades, signage, fire watch equipment, spill kit',
          ]}
        />
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.missionPeople}
          title="People (PCI)"
          initialItems={[
            "Every Seabee can state the mission, their task, and the commander's intent",
            'Crew can name the top hazards of the specific evolution — not a generic list',
            'Security plan briefed; who pulls security while the crew builds, sectors assigned',
            'Actions-on rehearsed — contact, casualty, equipment failure mid-task, fire',
            'Medical/admin currency checked — no profiles or non-deployables put on a 12-hour pour',
            "Fatigue and mental state read honestly — who's been on nights, who got bad news",
            'PPE worn for the trade — hearing pro for operators, eye pro, hard hats, hi-viz',
            'Hydration/work-rest cycle set for the heat',
          ]}
        />
      </SubBlock>
      <SubBlock theme="execution" letter="G" name="GENERIC / ANY TASKING">
        <Info>
          For any tasking, run the checks in this order: gear → security → comms → med → people.
        </Info>
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.genericGear}
          title="Gear (PCC)"
          initialItems={[
            'Sensitive items — weapons, optics, comms, NVDs, crypto — inventoried by serial, before and after',
            'Comms — radios up, PACE plan, check-in complete',
            'Weapons — clean, function-checked, correct ammo',
            'Med — IFAKs on every body, CASEVAC plan known, corpsman located',
          ]}
        />
        <EditableChecklist
          storageKey={CHECKLIST_KEYS.genericPeople}
          title="People (PCI)"
          initialItems={[
            'Every individual can state: the mission, their job in it, and what to do when it goes wrong',
            'Actions-on rehearsed for the most likely and most dangerous contingencies',
            'Leadership and succession identified',
            'Hydration, chow, PPE, work/rest — individual readiness to actually execute',
          ]}
        />
      </SubBlock>
    </Block>

    <SectionLabel>ORDERS</SectionLabel>
    <Block
      theme="ref"
      letter={<IconOrders />}
      name="ORDER TYPES"
      desc="OPORD, WARNORD, FRAGORD, back-brief"
    >
      <LeafItem
        letter="OP"
        text={
          <span>
            <strong>OPORD</strong> — the full order: Orientation, then the five paragraphs.
          </span>
        }
      />
      <LeafItem
        letter="W"
        text={
          <span>
            <strong>WARNORD</strong> — issued as soon as a mission arrives so subordinates start
            preparing: the essentials plus the planning timeline.
          </span>
        }
      />
      <LeafItem
        letter="F"
        text={
          <span>
            <strong>FRAGORD</strong> — a fragment of an order: only what changed (grids, timings, a
            new task). Everything else stands.
          </span>
        }
      />
      <LeafItem
        letter="BB"
        text={
          <span>
            <strong>Confirmation brief / back-brief</strong> — subordinates repeat the task, purpose
            and intent back to prove they understood.
          </span>
        }
      />
    </Block>

    <SectionLabel>TACTICAL CONTROL MEASURES</SectionLabel>
    <Block
      theme="orient"
      letter={<IconBoundary />}
      name="BOUNDARIES & AREAS"
      desc="Who is responsible for what ground"
    >
      <LeafItem
        letter="BD"
        text={
          <span>
            <strong>Boundary</strong> — divides responsibility between adjacent units. No firing
            across it without coordination.
          </span>
        }
      />
      <LeafItem
        letter="AO"
        text={
          <span>
            <strong>Area of operations</strong> — ground assigned to a commander, who is responsible
            for everything in it.
          </span>
        }
      />
      <LeafItem
        letter="AI"
        text={
          <span>
            <strong>Area of interest</strong> — beyond the AO: anything that can affect current and
            future operations.
          </span>
        }
      />
      <LeafItem
        letter="ZN"
        text={
          <span>
            <strong>Zone of action</strong> — assigned for an advance; the unit clears its zone and
            keeps contact with adjacent units.
          </span>
        }
      />
      <LeafItem
        letter="SC"
        text={
          <span>
            <strong>Sector of fire</strong> — area a weapon or unit is responsible for covering with
            fire.
          </span>
        }
      />
    </Block>
    <Block
      theme="orient"
      letter={<IconPhaseLine />}
      name="LINES & ROUTES"
      desc="Phase lines, LD, LOA, axes, routes"
    >
      <LeafItem
        letter="PL"
        text={
          <span>
            <strong>Phase line</strong> — an easily identified feature used to control movement and
            fires. Crossed, not held.
          </span>
        }
      />
      <LeafItem
        letter="LD"
        text={
          <span>
            <strong>Line of departure</strong> — where the attack begins, crossed at H-hour.
          </span>
        }
      />
      <LeafItem
        letter="LOA"
        text={
          <span>
            <strong>Limit of advance</strong> — the line attacking forces will not cross; prevents
            overextension and fratricide.
          </span>
        }
      />
      <LeafItem
        letter="FL"
        text={
          <span>
            <strong>FEBA / FLOT</strong> — forward edge of the battle area / forward line of own
            troops.
          </span>
        }
      />
      <LeafItem
        letter="AX"
        text={
          <span>
            <strong>Axis of advance</strong> — the general route; the unit isn't restricted to the
            road itself.
          </span>
        }
      />
      <LeafItem
        letter="DA"
        text={
          <span>
            <strong>Direction of attack</strong> — more restrictive than an axis: a set direction,
            no set route.
          </span>
        }
      />
      <LeafItem
        letter="RT"
        text={
          <span>
            <strong>Route</strong> — a prescribed course of travel; the most restrictive movement
            control.
          </span>
        }
      />
      <LeafItem
        letter="MSR"
        text={
          <span>
            <strong>MSR / ASR</strong> — main and alternate supply routes for sustainment.
          </span>
        }
      />
    </Block>
    <Block
      theme="orient"
      letter={<IconObjective />}
      name="POINTS & POSITIONS"
      desc="Objectives, checkpoints, rally points"
    >
      <LeafItem
        letter="OBJ"
        text={
          <span>
            <strong>Objective</strong> — a named area to be seized, secured or controlled; it drives
            the scheme of maneuver.
          </span>
        }
      />
      <LeafItem
        letter="TRP"
        text={
          <span>
            <strong>Target reference point</strong> — an easily recognized point used to orient and
            control fires.
          </span>
        }
      />
      <LeafItem
        letter="EA"
        text={
          <span>
            <strong>Engagement area</strong> — where you intend to contain and destroy an enemy
            force.
          </span>
        }
      />
      <LeafItem
        letter="CP"
        text={
          <span>
            <strong>Checkpoint · contact point · passage point</strong> — orientation and reporting;
            linking adjacent units; passing through another unit's position.
          </span>
        }
      />
      <LeafItem
        letter="SP"
        text={
          <span>
            <strong>Start point / release point</strong> — where a movement begins / where elements
            break off to their tasks.
          </span>
        }
      />
      <LeafItem
        letter="ORP"
        text={
          <span>
            <strong>Objective rally point</strong> — the last covered and concealed position before
            the objective.
          </span>
        }
      />
      <LeafItem
        letter="AA"
        text={
          <span>
            <strong>Assembly area / staging area</strong> — where units prepare, resupply and stage
            before execution.
          </span>
        }
      />
    </Block>
    <Block
      theme="orient"
      letter={<IconFireControl />}
      name="FIRE CONTROL"
      desc="CFL, NFL, RFL, FPF, PDF"
    >
      <LeafItem
        letter="CFL"
        text={
          <span>
            <strong>Coordinated fire line</strong> — beyond it, fires need no further coordination.
          </span>
        }
      />
      <LeafItem
        letter="NFL"
        text={
          <span>
            <strong>No-fire line</strong> — no fires beyond it without specific coordination.
          </span>
        }
      />
      <LeafItem
        letter="RFL"
        text={
          <span>
            <strong>Restrictive fire line</strong> — between converging forces; no firing across
            without coordination.
          </span>
        }
      />
      <LeafItem
        letter="NFA"
        text={
          <span>
            <strong>No-fire area · restrictive fire area · free-fire area</strong> — areas where
            fires are forbidden, restricted, or unrestricted.
          </span>
        }
      />
      <LeafItem
        letter="FPF"
        text={
          <span>
            <strong>Final protective fire</strong> — pre-planned barrier of fire in front of a
            position; the last resort.
          </span>
        }
      />
      <LeafItem
        letter="PDF"
        text={
          <span>
            <strong>Principal direction of fire</strong> — where a weapon is oriented when it has no
            FPL.
          </span>
        }
      />
    </Block>
    <Block
      theme="orient"
      letter={<IconWire />}
      name="ENGINEER MEASURES"
      desc="EAB, ADR, obstacle control, LP/OP, ECP"
    >
      <LeafItem
        letter="EAB"
        text={
          <span>
            <strong>Expeditionary advanced base</strong> — a temporary forward base established to
            support operations.
          </span>
        }
      />
      <LeafItem
        letter="ADR"
        text={
          <span>
            <strong>Airfield damage repair</strong> — rapid runway repair to minimum operating
            standards.
          </span>
        }
      />
      <LeafItem
        letter="MOS"
        text={
          <span>
            <strong>Minimum operating strip</strong> — the shortest usable runway for mission
            aircraft; drives ADR priorities.
          </span>
        }
      />
      <LeafItem
        letter="OZ"
        text={
          <span>
            <strong>Obstacle zone → belt → group</strong> — broad intent → tied to terrain →
            individual obstacles with a specific purpose.
          </span>
        }
      />
      <LeafItem
        letter="LP"
        text={
          <span>
            <strong>Listening post / observation post</strong> — forward security for early warning.
          </span>
        }
      />
      <LeafItem
        letter="ECP"
        text={
          <span>
            <strong>Entry control point</strong> — controlled access into a secured site.
          </span>
        }
      />
    </Block>

    <MapSymbolsSection />

    <NotesBlock sectionKey="tools" label="TOOLS" />
  </div>
);

export default ToolsView;
