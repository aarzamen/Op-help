import { ArrowRight } from 'lucide-react';
import { Block, Callout, Info, LeafItem, SectionLabel, SubBlock } from '../components/ui';
import { Glossary, RubricChecklist, TaskVerbList } from '../components/GuideWidgets';
import type { ViewId } from '../App';

const STEPS: { n: string; title: string; body: string; view: ViewId; cta: string }[] = [
  {
    n: '1',
    title: 'Receive',
    body: "Read higher's order twice. Find your tasking statement.",
    view: 'analyze',
    cta: 'ANALYZE',
  },
  {
    n: '2',
    title: 'Take it apart',
    body: 'METT-T: tasks, enemy, terrain, troops, time.',
    view: 'analyze',
    cta: 'ANALYZE',
  },
  {
    n: '3',
    title: 'Write yours',
    body: 'Orientation, then the five paragraphs.',
    view: 'order',
    cta: 'ORDER',
  },
  {
    n: '4',
    title: 'Plan CASEVAC',
    body: 'HLZ, CCP and route sketches; the 9-line.',
    view: 'casevac',
    cta: 'CASEVAC',
  },
  {
    n: '5',
    title: 'Brief it',
    body: 'On the terrain model, 30–60 minutes.',
    view: 'guide',
    cta: 'BELOW',
  },
];

const GuideView = ({ onNavigate }: { onNavigate: (v: ViewId) => void }) => (
  <div>
    <div className="hero">
      <div className="hero-kicker">START HERE</div>
      <h2 className="hero-title">Orders, start to finish</h2>
      <p className="hero-body">
        In the course you receive a higher headquarters' order, take it apart, write your own
        company order, and brief it as a team on a terrain model. This tab is the whole method on
        one page; the other tabs are the worksheets.
      </p>
      <ol className="flow">
        {STEPS.map((s) => (
          <li key={s.n}>
            <button type="button" className="flow-step" onClick={() => onNavigate(s.view)}>
              <span className="flow-n">{s.n}</span>
              <span className="flow-text">
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </span>
              <span className="flow-cta">
                {s.cta} <ArrowRight size={11} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>

    <SectionLabel>THE COURSE</SectionLabel>

    <Block
      theme="red"
      letter="✓"
      name="HOW THE BRIEF IS GRADED"
      desc="100 points · assign sections · check off as you rehearse"
      defaultOpen
    >
      <Info>
        Use the grading sheet as your outline: every block on it has to appear in the order and the
        brief, even briefly. “If a block needs to be checked and it's not addressed in the order, it
        will be a long day.”
      </Info>
      <RubricChecklist />
    </Block>

    <Block
      theme="blue"
      letter="◇"
      name="TAKING APART HIGHER'S ORDER"
      desc="Specified, implied and essential tasks — with a worked example"
    >
      <Info>
        Your mission is the tasking statement higher wrote <em>to you</em> (in their ¶3.c Tasks).
        Everything else in their order is context — and a hiding place for more tasks.
      </Info>
      <SubBlock theme="blue" letter="S" name="SPECIFIED TASKS — WHAT THE ORDER SAYS">
        <Info>
          Stated outright. Read the whole order, not just the tasks paragraph: specified tasks hide
          in coordinating instructions, admin & logistics, command & signal, and the annexes.
        </Info>
        <Callout kind="example" title="course exercise">
          Higher tasked ABCC to “establish EAB IVO MLR Obj 1 IOT support continuous airfield
          operations. MHP. BPT conduct airfield damage repair as needed.” And in the course's
          example LCT order, a tasking for ABCC to develop Bora Liggett's signal plan sits in the
          Command & Signal paragraph — nowhere near the tasks paragraph.
        </Callout>
      </SubBlock>
      <SubBlock theme="blue" letter="I" name="IMPLIED TASKS — WHAT YOU MUST DO ANYWAY">
        <Info>
          Not stated, but the mission fails without them. Five questions surface most of them:
        </Info>
        <LeafItem
          letter="1"
          text={
            <span>
              <strong>What has to happen before I can start?</strong> Movement, linkup, a relief in
              place, a site survey.
            </span>
          }
        />
        <LeafItem
          letter="2"
          text={
            <span>
              <strong>What does the terrain and weather force on me?</strong> An unfordable stream
              fixes the route; heat forces water resupply and work/rest cycles.
            </span>
          }
        />
        <LeafItem
          letter="3"
          text={
            <span>
              <strong>What does the enemy force on me?</strong> Drones → signature management and
              moving the COC; IEDs → route procedures and immediate actions.
            </span>
          }
        />
        <LeafItem
          letter="4"
          text={
            <span>
              <strong>Who must I coordinate with?</strong> Adjacent units, fires approval authority,
              the MEDEVAC net, whoever I'm relieving.
            </span>
          }
        />
        <LeafItem
          letter="5"
          text={
            <span>
              <strong>What runs out, and when?</strong> Water, fuel, ammunition, materials — and
              sleep.
            </span>
          }
        />
        <Callout kind="example" title="implied tasks for “establish an EAB IVO MLR Obj 1”">
          Link up with the convoy escort at the beach · move tactically to the objective · relieve
          the infantry's security on site · establish your own defense (“the defensive plan is
          yours, not inherited”) · establish the COC and comms with higher · establish a CCP and
          CASEVAC plan · plan water and fuel resupply for 24-hour construction · survey the site
          before building.
        </Callout>
        <Callout kind="tip" title="Then filter">
          “If implied tasks are understood through training, don't brief them — that takes
          initiative away from subordinate leaders. The exception is safety.” Keep the non-routine
          tasks someone must be assigned; drop “clean weapons” and “tie boots.”
        </Callout>
      </SubBlock>
      <SubBlock theme="blue" letter="E" name="ESSENTIAL TASK — WHAT DEFINES SUCCESS">
        <Info>
          The task that must be done or the mission fails — usually the one in your mission
          statement. It goes to your main effort, word for word (“deliberate redundancy”). Everyone
          else's tasks enable it.
        </Info>
      </SubBlock>
      <SubBlock theme="blue" letter="C/R" name="CONSTRAINTS & RESTRAINTS">
        <Info>
          Things higher makes you do (constraints — e.g. “displace the COC every 36 hours”) and
          things it forbids (restraints — e.g. “no white light after EENT”). The ROE come from
          higher; copy them rather than writing your own.
        </Info>
      </SubBlock>
      <button type="button" className="chip chip-solid" onClick={() => onNavigate('analyze')}>
        OPEN THE METT-T WORKSHEET <ArrowRight size={11} />
      </button>
    </Block>

    <Block
      theme="green"
      letter="Σ"
      name="WRITING IT — THE FORMULAS"
      desc="Mission, tasking statements, intent, parts, enemy"
    >
      <SubBlock theme="green" letter="M" name="MISSION — VERBATIM">
        <Info>
          Read higher's tasking statement to you word for word, MHP/THP and BPT included. Don't
          paraphrase it and don't merge two into one.
        </Info>
      </SubBlock>
      <SubBlock theme="green" letter="TK" name="TASKING STATEMENTS — THE MOST IMPORTANT PART">
        <div className="formula">
          [Unit]. You are the [main effort / supporting effort #]. Upon [trigger], [tactical task]
          [where] IOT [purpose]. [MHP/THP]
        </div>
        <Info>
          One per element, per part — three parts and three elements make nine statements. The
          instructors: “If nothing else is executed well, nailing the tasking statements would be an
          outstanding product.”
        </Info>
        <Callout kind="example" title="course example LCT order">
          “Alpha Co, ‘Alpha’. You are the ME. Upon CAAT suppression, secure MLR Obj 1 IOT deny the
          EN's ability to sabotage or utilize the airfield. MHP.”
        </Callout>
        <button type="button" className="chip" onClick={() => onNavigate('order')}>
          TASKING STATEMENT BUILDER → ORDER ¶3 <ArrowRight size={11} />
        </button>
      </SubBlock>
      <SubBlock theme="green" letter="CI" name="COMMANDER'S INTENT">
        <div className="formula">
          Purpose · Method · EN center of gravity · EN critical vulnerability · Exploitation ·
          Endstate
        </div>
        <Info>
          Purpose comes from your mission. The center of gravity is the enemy's greatest strength
          against you; the critical vulnerability is what that strength depends on that you can
          affect; the exploitation says how you will. Endstate: how it looks when the dust settles —
          for both sides.
        </Info>
      </SubBlock>
      <SubBlock theme="green" letter="P" name="PARTS — BW / EW / CE / CS">
        <div className="formula">Begins With · Ends With · Critical Event · Conditions Set</div>
        <Callout kind="example" title="instructor notes">
          Part One begins with movement from the assembly area and ends with occupation of the ORP.
          Critical event: ORP occupied. Conditions set to move to Part Two: ORP is occupied. “The
          critical event is what had to happen; the condition set is the observable trigger to move
          to the next part.”
        </Callout>
        <Info>
          Describe the scheme of maneuver with anonymous roles — main effort, supporting effort one
          — and name units only in the tasks.
        </Info>
      </SubBlock>
      <SubBlock theme="green" letter="EN" name="ENEMY — SALUTE → DRAW-D → EMLCOA">
        <Info>
          SALUTE describes the enemy you face now. DRAW-D rates what they can do — most likely,
          likely, unlikely — with exactly one “most likely.” The EMLCOA marries the two into one
          paragraph about what they will do when you execute.
        </Info>
      </SubBlock>
      <SubBlock theme="green" letter="!" name="SAY IT LIKE A DIRECTIVE">
        <table className="ref-table">
          <thead>
            <tr>
              <th>Instead of</th>
              <th>Say</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>“2nd Platoon should try to occupy the eastern sector if possible.”</td>
              <td>“2nd Platoon will occupy the eastern sector.”</td>
            </tr>
            <tr>
              <td>“We'd like the COC to maybe move every couple of days.”</td>
              <td>“The COC displaces every 36 hours.”</td>
            </tr>
            <tr>
              <td>“Level the ground, pour the slab, frame it, put on the roof…”</td>
              <td>“Establish an EAB IVO MLR Obj 1 IOT support continuous airfield operations.”</td>
            </tr>
          </tbody>
        </table>
        <Info>
          The grading sheet checks for the affirmative form and against qualified directives (“try
          to”, “should”, “if possible”).
        </Info>
      </SubBlock>
    </Block>

    <Block
      theme="amber"
      letter="Aa"
      name="WORDS MEAN THINGS — TACTICAL TASKS"
      desc="Doctrinal task verbs with plain-English meanings"
    >
      <Callout kind="tip">
        “Build” is not a tactical task — “establish” and “occupy” are. “An attempt with the wrong
        term is far better than a generic narrative.”
      </Callout>
      <TaskVerbList />
    </Block>

    <Block
      theme="purple"
      letter="▣"
      name="THE TERRAIN MODEL BRIEF"
      desc="Build it, run it, split it four ways"
    >
      <SubBlock theme="purple" letter="B" name="BUILD THE MODEL">
        <LeafItem
          letter="N"
          text={
            <span>
              <strong>Magnetic north arrow and a legend</strong> — both are graded before you say a
              word about the plan.
            </span>
          }
        />
        <LeafItem
          letter="G"
          text={
            <span>
              <strong>Grid lines</strong> (string or tape) labeled to match the map, so you can
              point to any grid.
            </span>
          }
        />
        <LeafItem
          letter="T"
          text={
            <span>
              <strong>Terrain</strong> — hills and ridgelines built up, streams, roads and the MSR,
              tree lines, buildings, the airfield.
            </span>
          }
        />
        <LeafItem
          letter="TC"
          text={
            <span>
              <strong>Every control measure</strong> labeled with title and grid (on the model, a
              board, or both).
            </span>
          }
        />
        <LeafItem
          letter="U"
          text={
            <span>
              <strong>A marker for every element</strong> — friendly rectangles, enemy diamonds — to
              move part by part.
            </span>
          }
        />
        <LeafItem
          letter="+"
          text={
            <span>
              <strong>CCP, HLZ and evacuation route</strong> — print the sketches from the CASEVAC
              tab.
            </span>
          }
        />
        <LeafItem
          letter="BD"
          text={
            <span>
              <strong>A board</strong> for grids, astronomical data, reports, challenge & pass and
              the timeline.
            </span>
          }
        />
      </SubBlock>
      <SubBlock theme="purple" letter="R" name="RUN THE BRIEF">
        <LeafItem
          letter="1"
          text={
            <span>
              <strong>Roll call by element</strong>, then legend and magnetic north.
            </span>
          }
        />
        <LeafItem
          letter="2"
          text={
            <span>
              <strong>Orientation</strong> — then take questions on it.
            </span>
          }
        />
        <LeafItem
          letter="3"
          text={
            <span>
              <strong>Situation → Mission → Execution</strong> — walk the markers through each part
              (“walk the dog”).
            </span>
          }
        />
        <LeafItem
          letter="4"
          text={
            <span>
              <strong>Admin & Logistics → Command & Signal</strong> — then questions.
            </span>
          }
        />
        <LeafItem
          letter="5"
          text={
            <span>
              <strong>Time hack</strong> to close.
            </span>
          }
        />
        <Info>
          Stand beside the model, face the audience, use a pointer, and don't read the order.
          Rehearse with a timer — 30 to 60 minutes.
        </Info>
      </SubBlock>
      <SubBlock theme="purple" letter="4" name="SPLITTING IT FOUR WAYS">
        <Info>
          The course standard is an officer–enlisted pair: the officer briefs Orientation,
          Situation, Mission and Execution; the enlisted leader briefs Admin & Logistics and Command
          & Signal (“beds, heads… logistics, and discipline”). With four people, one way to split
          it:
        </Info>
        <table className="ref-table">
          <tbody>
            <tr>
              <td className="mono">A</td>
              <td>Preparation, Orientation, ¶1 Situation</td>
              <td className="mono">32 pts</td>
            </tr>
            <tr>
              <td className="mono">B</td>
              <td>¶2 Mission, ¶3 Execution — the tasking statements</td>
              <td className="mono">31 pts</td>
            </tr>
            <tr>
              <td className="mono">C</td>
              <td>¶4 Admin & Logistics — CASEVAC, EPWs, sustainment</td>
              <td className="mono">16 pts</td>
            </tr>
            <tr>
              <td className="mono">D</td>
              <td>¶5 Command & Signal, the model and board, the time hack</td>
              <td className="mono">7 pts</td>
            </tr>
          </tbody>
        </table>
        <Info>
          Everyone owns delivery (14 pts). Rehearse the hand-offs: “I'll now turn it over to … for
          Execution.”
        </Info>
      </SubBlock>
      <SubBlock theme="purple" letter="✗" name="COMMON MISTAKES">
        <LeafItem
          letter="1"
          text={<span>Narrating the map — terrain without the “so what.”</span>}
        />
        <LeafItem
          letter="2"
          text={
            <span>Weather as numbers with no effects on troops, weapons, CESE and the enemy.</span>
          }
        />
        <LeafItem
          letter="3"
          text={<span>Higher's enemy instead of yours; more than one “most likely.”</span>}
        />
        <LeafItem letter="4" text={<span>A paraphrased or merged mission statement.</span>} />
        <LeafItem
          letter="5"
          text={
            <span>
              Unit names in the scheme of maneuver; supporting-effort numbers that change between
              parts without reason.
            </span>
          }
        />
        <LeafItem
          letter="6"
          text={<span>Tasking statements written as stories, or missing the IOT purpose.</span>}
        />
        <LeafItem
          letter="7"
          text={
            <span>
              Skipping NO GO criteria or immediate actions (4 points together); forgetting the time
              hack.
            </span>
          }
        />
      </SubBlock>
    </Block>

    <Block
      theme="slate"
      letter="↔"
      name="COMING FROM CLINICAL PRACTICE"
      desc="Memory hooks for clinicians — social work, nursing, medicine"
    >
      <Info>
        Not equivalences — memory hooks. The structure of an order maps surprisingly well onto how
        you already plan care.
      </Info>
      <table className="ref-table">
        <tbody>
          <tr>
            <td>
              <strong>Situation</strong>
            </td>
            <td>The biopsychosocial assessment — the context before any plan.</td>
          </tr>
          <tr>
            <td>
              <strong>Mission analysis</strong>
            </td>
            <td>Case formulation: making sense of the data.</td>
          </tr>
          <tr>
            <td>
              <strong>Mission statement</strong>
            </td>
            <td>The referral question, stated so anyone could act on it.</td>
          </tr>
          <tr>
            <td>
              <strong>Specified task</strong>
            </td>
            <td>What the referral explicitly asks for.</td>
          </tr>
          <tr>
            <td>
              <strong>Implied task</strong>
            </td>
            <td>
              What you must do though nobody wrote it down — releases of information, an
              interpreter, a safety plan.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Commander's intent</strong>
            </td>
            <td>
              The goal of care and its why — what lets a covering clinician adapt when the patient
              shows up different.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Parts, BW / EW, conditions set</strong>
            </td>
            <td>Phases of care with entry and exit criteria, like step-down readiness.</td>
          </tr>
          <tr>
            <td>
              <strong>EMLCOA vs most dangerous</strong>
            </td>
            <td>Most likely course versus worst case — a risk assessment.</td>
          </tr>
          <tr>
            <td>
              <strong>NO GO criteria</strong>
            </td>
            <td>Exclusion criteria and stop rules.</td>
          </tr>
          <tr>
            <td>
              <strong>Coordinating instructions</strong>
            </td>
            <td>Protocols everyone follows — crisis response, documentation.</td>
          </tr>
          <tr>
            <td>
              <strong>Admin & logistics</strong>
            </td>
            <td>Resources: appointments, meds, transport, supplies.</td>
          </tr>
          <tr>
            <td>
              <strong>Command & signal · PACE</strong>
            </td>
            <td>Who's on call, how to reach them, and the backup contact plan.</td>
          </tr>
          <tr>
            <td>
              <strong>Confirmation brief</strong>
            </td>
            <td>Teach-back.</td>
          </tr>
          <tr>
            <td>
              <strong>Rehearsal</strong>
            </td>
            <td>Role-play.</td>
          </tr>
        </tbody>
      </table>
      <Callout kind="note" title="Where your training transfers directly">
        Human factors in the METT-T Troops analysis (training level, morale, headspace, fatigue) ·
        work/rest and heat · MASCAL triage · humane treatment of detainees and enemy casualties ·
        the CASEVAC plan in ¶4.
      </Callout>
    </Block>

    <Block
      theme="slate"
      letter="▲"
      name="WARFIGHTING CONCEPTS"
      desc="Levels of war, maneuver vs attrition, OODA, tenets"
    >
      <LeafItem
        letter="S"
        text={
          <span>
            <strong>Strategic</strong> — national policy and objectives.
          </span>
        }
      />
      <LeafItem
        letter="O"
        text={
          <span>
            <strong>Operational</strong> — campaigns and major operations: when, where, and on what
            terms to fight.
          </span>
        }
      />
      <LeafItem
        letter="T"
        text={
          <span>
            <strong>Tactical</strong> — missions, battles and engagements. Where this course lives.
            Everything flows downward — work that doesn't serve the objective has zero effect.
          </span>
        }
      />
      <LeafItem
        letter="AM"
        text={
          <span>
            <strong>Attrition vs maneuver</strong> — attrition attacks the enemy's capability to
            fight; maneuver attacks the ability and will to fight with speed, surprise and position.
            Good units use both.
          </span>
        }
      />
      <LeafItem
        letter="⟳"
        text={
          <span>
            <strong>OODA loop</strong> — observe, orient, decide, act. Whoever cycles faster
            controls the tempo; know when to act and when not to.
          </span>
        }
      />
      <LeafItem
        letter="TT"
        text={
          <span>
            <strong>Tactical tenets</strong> — achieve a decision, gain advantage, adapt and control
            tempo, exploit success.
          </span>
        }
      />
      <Callout kind="note">“This course makes you harder to replace and easier to trust.”</Callout>
    </Block>

    <Block
      theme="slate"
      letter="A–Z"
      name="GLOSSARY"
      desc="Every acronym in the course order, searchable"
    >
      <Glossary />
    </Block>
  </div>
);

export default GuideView;
