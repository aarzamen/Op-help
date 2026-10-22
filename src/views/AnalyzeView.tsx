import { Block, Callout, Info, LeafItem, SectionLabel, SubBlock } from '../components/ui';
import { InlineNotes, NotesBlock } from '../components/notes';
import type { ViewId } from '../App';

/** METT-T mission analysis — taking higher's order apart before writing your own. */
const AnalyzeView = ({ onNavigate }: { onNavigate: (v: ViewId) => void }) => (
  <div>
    <SectionLabel>MISSION ANALYSIS · METT-T</SectionLabel>
    <Info>
      Take higher's order apart before you write yours. Each factor feeds a part of your order:
      Mission → ¶2 and your tasks · Enemy → ¶1 · Terrain & weather → Orientation · Troops & fire
      support → task organization and fires · Time → the timeline.
    </Info>

    <Block
      theme="mission"
      letter="M"
      name="MISSION"
      desc="Your tasking statement: task, purpose, priority"
    >
      <Info>
        Find the tasking statement higher wrote to you (their ¶3.c). It holds the 5 W's. Pull out
        the <em>task</em> (what you do) and the <em>purpose</em> (why — your task either{' '}
        <em>causes</em> something or <em>enables</em> someone else).
      </Info>
      <SubBlock theme="mission" letter="TK" name="TASKS — SPECIFIED, IMPLIED, ESSENTIAL">
        <LeafItem
          letter="S"
          text={
            <span>
              <strong>Specified</strong> — stated in the order. Read all of it: tasks, coordinating
              instructions, admin & log, annexes. <em>“Words mean things.”</em>
            </span>
          }
        />
        <LeafItem
          letter="I"
          text={
            <span>
              <strong>Implied</strong> — not stated but required to do the specified tasks: deduced
              from the intent, the terrain, the enemy and the timeline.
            </span>
          }
        />
        <LeafItem
          letter="E"
          text={
            <span>
              <strong>Essential</strong> — must happen or the mission fails; usually the task you
              will give your main effort.
            </span>
          }
        />
        <Callout kind="tip" title="Don't brief what training covers">
          “If implied tasks are understood through training, don't brief them — that takes
          initiative away from subordinate leaders. The exception is safety.” “Secure” already
          carries 360° security, crew-served placement and interlocking fires.
        </Callout>
        <button type="button" className="chip" onClick={() => onNavigate('guide')}>
          HOW TO FIND IMPLIED TASKS → GUIDE
        </button>
      </SubBlock>
      <SubBlock theme="mission" letter="PR" name="PRIORITY — MHP / THP">
        <LeafItem
          letter="M"
          text={
            <span>
              <strong>MHP</strong> — mission has priority: get it done even if it takes longer.
            </span>
          }
        />
        <LeafItem
          letter="T"
          text={
            <span>
              <strong>THP</strong> — time has priority: meet the time even if the product isn't
              perfect.
            </span>
          }
        />
        <Info>Priority flows downward — every tasking statement you write carries its own.</Info>
      </SubBlock>
      <SubBlock theme="execution" letter="BP" name="BACKWARDS PLANNING">
        <Info>
          Start from actions on the objective and work back to where you stand now — what has to
          happen right before that, and before that. It exposes logistics and timing gaps. Show
          restraint: “You don't need to brief that troops tie their boots.”
        </Info>
      </SubBlock>
      <SubBlock theme="execution" letter="EP" name="ENGINEERING PRIORITIES">
        <Info>
          For construction missions, set engineering priorities from the commander's intent, enemy,
          engineer capability, mission type, logistics, time and materials. Higher maintains a{' '}
          <em>PEPL</em> (prioritized engineer project list).
        </Info>
      </SubBlock>
      <InlineNotes id="mettt-m" label="Mission" />
    </Block>

    <Block theme="situation" letter="E" name="ENEMY" desc="SALUTE → DRAW-D → EMLCOA">
      <Callout kind="tip">
        “Your enemy, not higher's.” Zoom in: the threat in your AO may be small arms and sUAS, not
        the missiles in higher's paragraph.
      </Callout>
      <SubBlock theme="situation" letter="S" name="SALUTE — COMPOSITION, DISPOSITION, STRENGTH">
        <LeafItem
          letter="S"
          text={
            <span>
              <strong>Size</strong> — in our terms: platoon, squad, fire team.
            </span>
          }
        />
        <LeafItem
          letter="A"
          text={
            <span>
              <strong>Activity</strong> — what have they been doing?
            </span>
          }
        />
        <LeafItem
          letter="L"
          text={
            <span>
              <strong>Location</strong> — where? Grids when you can.
            </span>
          }
        />
        <LeafItem
          letter="U"
          text={
            <span>
              <strong>Unit</strong> — who are they? Often copied from higher.
            </span>
          }
        />
        <LeafItem
          letter="T"
          text={
            <span>
              <strong>Time</strong> — how current is the information?
            </span>
          }
        />
        <LeafItem
          letter="E"
          text={
            <span>
              <strong>Equipment</strong> — weapons and ranges, comms, night vision, vehicles,
              uniforms.
            </span>
          }
        />
        <Info>
          Bulletize SALUTE down the page for the brief; paragraphs are fine for your own planning.
        </Info>
      </SubBlock>
      <SubBlock theme="situation" letter="D" name="DRAW-D — CAPABILITIES">
        <div className="info-text info-warn">
          Rate each most likely / likely / unlikely — only ONE can be most likely.
        </div>
        <LeafItem
          letter="D"
          text={
            <span>
              <strong>Defend</strong> — can they? In what formation, with what weapons?
            </span>
          }
        />
        <LeafItem
          letter="R"
          text={
            <span>
              <strong>Reinforce</strong> — from where, how many, how long?
            </span>
          }
        />
        <LeafItem
          letter="A"
          text={
            <span>
              <strong>Attack</strong> — what does it look like and how likely is it?
            </span>
          }
        />
        <LeafItem
          letter="W"
          text={
            <span>
              <strong>Withdraw</strong> — which direction, at what casualty level?
            </span>
          }
        />
        <LeafItem
          letter="D"
          text={
            <span>
              <strong>Delay</strong> — IEDs, obstacles, harassing fire; delay can mean slowing your
              milestones, not just your movement.
            </span>
          }
        />
      </SubBlock>
      <SubBlock theme="situation" letter="EM" name="EMLCOA">
        <Info>
          One paragraph that marries SALUTE and DRAW-D into your professional estimate of what the
          enemy will do when you execute.
        </Info>
        <Callout kind="example" title="class METT-T lecture">
          “The enemy will begin harassing fires with fire team–sized elements to measure friendly
          response before escalating to squad-reinforced attacks… at 25% casualties they will
          withdraw through the woods to the northwest.”
        </Callout>
        <div className="connector">SALUTE + DRAW-D = EMLCOA</div>
        <InlineNotes id="mettt-e-emlcoa" label="EMLCOA" />
      </SubBlock>
    </Block>

    <Block
      theme="orient"
      letter="T"
      name="TERRAIN & WEATHER"
      desc="KOCOA + weather — always with the “so what”"
    >
      <SubBlock theme="orient" letter="KO" name="KOCOA — TERRAIN">
        <LeafItem
          letter="K"
          text={
            <span>
              <strong>Key terrain</strong> — what, where, what advantage. Mission-specific — don't
              narrate the map.
            </span>
          }
        />
        <LeafItem
          letter="O"
          text={
            <span>
              <strong>Observation & fields of fire</strong> — how far can I see and shoot? The
              enemy's weapons too.
            </span>
          }
        />
        <LeafItem
          letter="C"
          text={
            <span>
              <strong>Cover & concealment</strong> — cover stops bullets; concealment stops
              observation.
            </span>
          }
        />
        <LeafItem
          letter="O"
          text={
            <span>
              <strong>Obstacles</strong> — natural and man-made; effect on movement, defense and
              construction.
            </span>
          }
        />
        <LeafItem
          letter="A"
          text={
            <span>
              <strong>Avenues of approach</strong> — specific routes with pros and cons for both
              sides. Don't just list roads.
            </span>
          }
        />
        <InlineNotes id="mettt-t-kocoa" label="KOCOA" />
      </SubBlock>
      <SubBlock theme="orient" letter="WX" name="WEATHER">
        <LeafItem
          letter="V"
          text={
            <span>
              <strong>Visibility</strong> — NVGs, thermals, target acquisition.
            </span>
          }
        />
        <LeafItem
          letter="W"
          text={
            <span>
              <strong>Wind</strong> — aviation, cranes, dust, sUAS, comms.
            </span>
          }
        />
        <LeafItem
          letter="P"
          text={
            <span>
              <strong>Precipitation</strong> — soil trafficability, digging, concrete, equipment.
            </span>
          }
        />
        <LeafItem
          letter="C"
          text={
            <span>
              <strong>Cloud cover</strong> — illumination, sensors, CAS availability.
            </span>
          }
        />
        <LeafItem
          letter="T"
          text={
            <span>
              <strong>Temperature</strong> — heat and cold casualties, work/rest, equipment, fuel
              use.
            </span>
          }
        />
        <LeafItem
          letter="S"
          text={
            <span>
              <strong>Sea state</strong> — ship-to-shore movement.
            </span>
          }
        />
        <Info>
          Astronomical data, not astrological. Say why the weather matters to your mission.
        </Info>
        <Callout kind="example" title="course exercise NO GO">
          Winds over 50 mph in the AO on D-Day — a weather limit that cancels the operation.
        </Callout>
        <InlineNotes id="mettt-t-wx" label="Weather" />
      </SubBlock>
    </Block>

    <Block
      theme="situation"
      letter="T"
      name="TROOPS & FIRE SUPPORT"
      desc="Task organization, assets, human factors, fires"
    >
      <SubBlock theme="situation" letter="TR" name="TROOPS">
        <LeafItem
          letter="1"
          text={
            <span>
              <strong>Task organization</strong> — how you break up the unit: security,
              construction, defense.
            </span>
          }
        />
        <LeafItem
          letter="2"
          text={
            <span>
              <strong>Organic assets</strong> — what equipment, when and how employed. Don't convoy
              gear you won't need for weeks.
            </span>
          }
        />
        <LeafItem
          letter="3"
          text={
            <span>
              <strong>Human factors</strong> — training level, morale, headspace, fatigue. Know your
              people.
            </span>
          }
        />
        <InlineNotes id="mettt-tr" label="Troops" />
      </SubBlock>
      <SubBlock theme="execution" letter="FS" name="FIRE SUPPORT">
        <LeafItem
          letter="GS"
          text={
            <span>
              <strong>General support</strong> — available to all; a priority list decides who's
              served first.
            </span>
          }
        />
        <LeafItem
          letter="DS"
          text={
            <span>
              <strong>Direct support</strong> — dedicated to a unit, but tasking authority stays
              with higher.
            </span>
          }
        />
        <LeafItem
          letter="AT"
          text={
            <span>
              <strong>Attached</strong> — tasking authority is yours.
            </span>
          }
        />
        <Info>
          Direct fire (crew-served machine guns) and indirect fire (mortars, artillery). Task fire
          support every part — four parts, four times.
        </Info>
        <InlineNotes id="mettt-fs" label="Fire Support" />
      </SubBlock>
    </Block>

    <Block
      theme="execution"
      letter="T"
      name="TIME AVAILABLE"
      desc="Backwards plan from actions on the objective"
    >
      <Info>
        Time is the hardest factor to shape — you can never make more, and the enemy always has a
        say.
      </Info>
      <LeafItem
        letter="M"
        text={
          <span>
            <strong>Mission vs time</strong> — how long will it take? Set realistic NLTs.
          </span>
        }
      />
      <LeafItem
        letter="E"
        text={
          <span>
            <strong>Enemy vs time</strong> — how fast can they reinforce, emplace obstacles,
            withdraw?
          </span>
        }
      />
      <LeafItem
        letter="T"
        text={
          <span>
            <strong>Troops vs time</strong> — engineers on security can't build. Time real tasks: a
            CONEX load, a COC tent, a concrete pad.
          </span>
        }
      />
      <LeafItem
        letter="D"
        text={
          <span>
            <strong>Distance vs time</strong> — loading, offloading and security all add up.
          </span>
        }
      />
      <LeafItem
        letter="W"
        text={
          <span>
            <strong>Terrain & weather vs time</strong> — mud, frozen soil, vegetation and heat slow
            everything.
          </span>
        }
      />
      <Info>
        Build two timelines: admin/logistics (hours) and actions on the objective (minutes).
      </Info>
      <InlineNotes id="mettt-time" label="Time Available" />
    </Block>

    <NotesBlock sectionKey="mettt" label="ANALYZE" />
  </div>
);

export default AnalyzeView;
