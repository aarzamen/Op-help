import { Ambulance } from 'lucide-react';
import { IconHeader, IconStopwatch } from '../components/icons';
import { Block, Callout, Info, LeafItem, SectionLabel, SubBlock } from '../components/ui';
import { InlineNotes, NotesBlock } from '../components/notes';
import { FieldRow, TextField } from '../components/form';
import { GetGridButton } from '../components/compass';
import TaskingBuilder from '../components/TaskingBuilder';
import { useLocalStorage } from '../lib/storage';
import { ORDER_META_DEFAULT, ORDER_META_KEY, type OrderMeta } from '../lib/orderMeta';
import type { ViewId } from '../App';

const Pts = ({ n }: { n: number }) => <span className="pts">{n} PTS</span>;

const OrderView = ({ onNavigate }: { onNavigate: (v: ViewId) => void }) => {
  const [meta, setMeta] = useLocalStorage<OrderMeta>(ORDER_META_KEY, ORDER_META_DEFAULT);

  return (
    <div>
      <SectionLabel>YOUR ORDER · OSMEAC</SectionLabel>
      <Info>
        Orientation is briefed first; then the five paragraphs. Each block lists exactly what the
        grading sheet checks, with points. The <em>TEMPLATE</em> button drops the matching outline
        into the notes. Some course documents number Orientation as paragraph 1 — the content and
        order are the same either way.
      </Info>

      <Block
        theme="ref"
        letter={<IconHeader />}
        name="ORDER HEADER"
        desc="Unit, operation, banner — printed on the PDF"
      >
        <FieldRow>
          <TextField
            label="Unit"
            value={meta.unit}
            onChange={(v) => setMeta({ ...meta, unit: v })}
            placeholder="ABCC “Gotham”"
          />
          <TextField
            label="Operation / exercise"
            value={meta.operation}
            onChange={(v) => setMeta({ ...meta, operation: v })}
            placeholder="EXERCISE PERSISTENT FREEDOM"
          />
        </FieldRow>
        <TextField
          label="Banner"
          value={meta.banner}
          onChange={(v) => setMeta({ ...meta, banner: v })}
          mono
          hint="Printed at the top of every page."
        />
      </Block>

      {/* ===== ORIENTATION ===== */}
      <Block
        theme="orient"
        letter="O"
        kicker="BRIEFED FIRST · 12 PTS"
        name="ORIENTATION"
        desc="Big picture, control measures, terrain & weather"
      >
        <Info>
          Orient the audience to the ground — on the terrain model — before anything else. Questions
          wait until Orientation is done.
        </Info>
        <LeafItem
          letter="a"
          text={
            <span>
              <strong>General overview</strong> — the strategic and operational picture: who is
              fighting whom, why we are here, what higher is trying to do. <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="b"
          text={
            <span>
              <strong>Tactical control measures</strong> — each one's title, type, physical
              description and grid (posted on a board, the model, or both). <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="c"
          text={
            <span>
              <strong>Terrain & weather — KOCOAW</strong> for friendly <em>and</em> enemy: key
              terrain, observation & fields of fire, cover & concealment, obstacles, avenues of
              approach, and weather with its effects plus 3 days of astronomical data. <Pts n={8} />
            </span>
          }
        />
        <LeafItem
          letter="PL"
          text={
            <span className="leaf-split">
              <span>
                <strong>Present location</strong> — drop your GPS grid into the notes.
              </span>
              <GetGridButton />
            </span>
          }
        />
        <Callout kind="tip" title="Key terrain needs a “so what”">
          “Narrating the map without explaining relevance” is the classic mistake. Not “there is a
          bridge to the north” — say what it is, what it provides, and why it matters to{' '}
          <em>this</em> mission.
        </Callout>
        <Callout kind="pitfall">
          Weather briefed as a list of numbers. Graders want the effects on personnel, weapons,
          equipment and CESE — and on the enemy.
        </Callout>
        <InlineNotes id="osmeac-o" label="Orientation" />
      </Block>

      {/* ===== 1. SITUATION ===== */}
      <Block
        theme="situation"
        letter="1"
        kicker="¶1 · 17 PTS"
        name="SITUATION"
        desc="Task org, enemy, friendly, attachments"
      >
        <SubBlock theme="situation" letter="TO" name="TASK ORGANIZATION & BATTLESPACE · 2 PTS">
          <Info>
            Who belongs to whom (it heads the written order), then the tactical picture around you.
          </Info>
          <InlineNotes id="osmeac-s-to" label="Task Organization" />
        </SubBlock>
        <SubBlock theme="situation" letter="EN" name="ENEMY — SALUTE → DRAW-D → EMLCOA · 8 PTS">
          <LeafItem
            letter="S"
            text={
              <span>
                <strong>SALUTE</strong> — size, activity, location, unit, time, equipment. Bulletize
                it down the page.
              </span>
            }
          />
          <LeafItem
            letter="D"
            text={
              <span>
                <strong>DRAW-D</strong> — defend, reinforce, attack, withdraw, delay: capable?
                likely? what does it look like against you?
              </span>
            }
          />
          <LeafItem
            letter="EM"
            text={
              <span>
                <strong>EMLCOA</strong> — one narrative paragraph that marries SALUTE and DRAW-D.
              </span>
            }
          />
          <Callout kind="tip">
            “Your enemy, not higher's.” Higher may list missiles and navies; zoom in to what the
            enemy looks like in your AO.
          </Callout>
          <Callout kind="pitfall">
            More than one “most likely.” If you tell your troops everything is most likely, nothing
            is.
          </Callout>
          <div className="connector">SAME ANALYSIS AS ANALYZE → ENEMY</div>
          <InlineNotes id="osmeac-s-en" label="Enemy Forces" />
        </SubBlock>
        <SubBlock
          theme="situation"
          letter="FR"
          name="FRIENDLY — HIGHER, ADJACENT, SUPPORTING · 5 PTS"
        >
          <LeafItem
            letter="H"
            text={
              <span>
                <strong>Higher, two levels</strong> — unit & call sign, HQ location, task, intent.
              </span>
            }
          />
          <LeafItem
            letter="A"
            text={
              <span>
                <strong>Adjacent</strong> — same higher, different mission, near you.
              </span>
            }
          />
          <LeafItem
            letter="S"
            text={
              <span>
                <strong>Supporting</strong> — same higher, supporting your mission (aviation, fires,
                sealift, recon).
              </span>
            }
          />
          <Callout kind="example" title="course exercise">
            Supporting: HMH-361 “Flying Tiger” — lift, insertion and medical evacuation. Tango Co
            5/11 — direct support to 3d LCT; fire missions for ABCC with approval at 3d LCT.
          </Callout>
          <InlineNotes id="osmeac-s-fr" label="Friendly Forces" />
        </SubBlock>
        <SubBlock theme="situation" letter="A/D" name="ATTACHMENTS & DETACHMENTS · 2 PTS">
          <Info>
            Attachments belong to you for tasking; detachments no longer belong to you. Say who, and
            the effective date-time.
          </Info>
          <InlineNotes id="osmeac-s-ad" label="Attachments & Detachments" />
        </SubBlock>
      </Block>

      {/* ===== 2. MISSION ===== */}
      <Block
        theme="mission"
        letter="2"
        kicker="¶2 · 5 PTS"
        name="MISSION"
        desc="Higher's tasking statement to you — verbatim"
      >
        <Info>
          Your mission is the tasking statement higher gave you in their ¶3.c — read{' '}
          <em>verbatim</em>, including MHP/THP and any BPT task. It holds the 5 W's: who, what
          (task), when, where, why (purpose, the “IOT”).
        </Info>
        <Callout kind="example" title="higher's tasking to ABCC">
          Upon occupation of MLR Obj 1, establish EAB IVO MLR Obj 1 IOT support continuous airfield
          operations. MHP. BPT conduct airfield damage repair as needed.
        </Callout>
        <Callout kind="pitfall">
          Paraphrasing, or merging two of higher's tasking statements into one “mission.” Verbatim
          is the graded standard.
        </Callout>
        <Info>
          Then give exactly this task to your main effort in ¶3 — “deliberate redundancy,” in the
          instructors' words.
        </Info>
        <InlineNotes id="osmeac-m" label="Mission" />
      </Block>

      {/* ===== 3. EXECUTION ===== */}
      <Block
        theme="execution"
        letter="3"
        kicker="¶3 · 26 PTS"
        name="EXECUTION"
        desc="Intent, concept by part, tasks, fires, coordinating instructions"
      >
        <SubBlock theme="execution" letter="CI" name="COMMANDER'S INTENT · 6 PTS">
          <LeafItem
            letter="P"
            text={
              <span>
                <strong>Purpose</strong> — derived from your mission.
              </span>
            }
          />
          <LeafItem
            letter="M"
            text={
              <span>
                <strong>Method</strong> — how you will accomplish your task, in broad strokes.
              </span>
            }
          />
          <LeafItem
            letter="CG"
            text={
              <span>
                <strong>EN center of gravity</strong> — their greatest strength to neutralize you.
              </span>
            }
          />
          <LeafItem
            letter="CV"
            text={
              <span>
                <strong>EN critical vulnerability</strong> — what that strength relies on that you
                can affect.
              </span>
            }
          />
          <LeafItem
            letter="X"
            text={
              <span>
                <strong>Exploitation</strong> — how you will exploit the CV.
              </span>
            }
          />
          <LeafItem
            letter="ES"
            text={
              <span>
                <strong>Endstate</strong> — how it looks when the dust settles, for friendly and
                enemy.
              </span>
            }
          />
          <Callout kind="example" title="course example order">
            CV: “Their inability to effectively conduct long-range communications with adjacent
            units… prohibits their elements from mutually supporting one another.” Exploitation: C2
            nodes never stay in one place long enough to be targeted.
          </Callout>
          <InlineNotes id="osmeac-e-ci" label="Commander's Intent" />
        </SubBlock>

        <SubBlock theme="execution" letter="CO" name="CONCEPT OF OPERATIONS — PARTS · 6 PTS">
          <Info>
            Break the operation into parts (the instructors' term; the sheet accepts
            phase/stage/part). For every part:
          </Info>
          <LeafItem
            letter="BW"
            text={
              <span>
                <strong>Begins with</strong> — the event that starts the part.
              </span>
            }
          />
          <LeafItem
            letter="EW"
            text={
              <span>
                <strong>Ends with</strong> — the event that ends it.
              </span>
            }
          />
          <LeafItem
            letter="CE"
            text={
              <span>
                <strong>Critical event</strong> — the single thing that must happen for the part to
                succeed. Doesn't have to be a tactical task.
              </span>
            }
          />
          <LeafItem
            letter="CS"
            text={
              <span>
                <strong>Conditions set</strong> — a visible, observable sign the force is ready to
                move to the next part. Often the same as the critical event.
              </span>
            }
          />
          <LeafItem
            letter="SM"
            text={
              <span>
                <strong>Scheme of maneuver</strong> — form of maneuver, direction and order of
                movement: “walk the dog” on the terrain model.
              </span>
            }
          />
          <Callout kind="tip" title="Anonymity until tasking">
            In the scheme of maneuver say main effort, supporting effort one, supporting effort two
            — never “1st Platoon.” Everyone listens to every role; units are named in the tasks.
          </Callout>
          <Callout kind="example" title="instructor part sequence for an EAB">
            Part 1 tactical convoy → Part 2 occupy the ORP → Part 3 establish the defensive posture
            → Part 4 establish the EAB. The mission ends at “establish”; anything after that is a
            new tasking (FRAGO).
          </Callout>
          <InlineNotes id="osmeac-e-co" label="Concept of Operations" />
        </SubBlock>

        <SubBlock theme="execution" letter="TK" name="TASKS — TASKING STATEMENTS · 8 PTS">
          <Info>
            “The most critical component of the OPORD.” One tasking statement per element, per part:
            three parts × three elements = nine statements. Each has the 5 W's with a task and a
            purpose.
          </Info>
          <TaskingBuilder />
          <Callout kind="example" title="instructor template">
            “First Platoon, you are the main effort. Upon arrival at MLR Objective One, you will
            establish an EAB in the vicinity of grid 12D456, in order to allow NMCB-4 to occupy MLR
            Objective One.”
          </Callout>
          <Callout kind="pitfall">
            Writing a narrative (“level the ground, pour the pad, frame the walls…”). The statement
            is a short directive; trained crew leaders break it down. An attempt with the wrong
            tactical task beats a generic narrative.
          </Callout>
          <InlineNotes id="osmeac-e-tk" label="Tasks" />
        </SubBlock>

        <SubBlock theme="execution" letter="FS" name="FIRE SUPPORT PLAN">
          <Info>
            Task, purpose, method, effect; priority of fires and target precedence. Fire support
            gets tasked every part — four parts, four times.
          </Info>
          <InlineNotes id="osmeac-e-fs" label="Fire Support" />
        </SubBlock>

        <SubBlock theme="execution" letter="CO-I" name="COORDINATING INSTRUCTIONS · 6 PTS">
          <LeafItem
            letter="1"
            text={
              <span>
                <strong>Actions on the objective</strong> — site occupation (how and in what order
                you occupy) and camp layout.
              </span>
            }
          />
          <LeafItem
            letter="2"
            text={
              <span>
                <strong>Priorities of work</strong> — what order, how soon (the defensive-ops class
                used SAFE-SOC with hour deadlines).
              </span>
            }
          />
          <LeafItem
            letter="3"
            text={
              <span>
                <strong>Specific instructions · priority of rehearsals · ROE</strong> (dictated by
                higher — copy it).
              </span>
            }
          />
          <LeafItem
            letter="4"
            text={
              <span>
                <strong>Immediate actions</strong> (not limited to enemy contact) and{' '}
                <strong>NO GO criteria</strong>.
              </span>
            }
          />
          <LeafItem
            letter="5"
            text={
              <span>
                <strong>Changes to SOP · lost/missing member</strong> (what the lost member does,
                what the unit does).
              </span>
            }
          />
          <LeafItem
            letter="6"
            text={
              <span>
                <strong>Reports</strong> (what, when, who sends, to whom, how fast) and the{' '}
                <strong>timeline</strong> from the order brief to departing friendly lines.
              </span>
            }
          />
          <InlineNotes id="osmeac-e-coord" label="Coordinating Instructions" />
        </SubBlock>
      </Block>

      {/* ===== 4. ADMIN & LOGISTICS ===== */}
      <Block
        theme="admin"
        letter="4"
        kicker="¶4 · 16 PTS · USUALLY THE ENLISTED BRIEFER"
        name="ADMIN & LOGISTICS"
        desc="CASEVAC, EPWs, chow & water, ammo, gear, materials, fuel"
      >
        <LeafItem
          letter="a"
          text={
            <span className="leaf-split">
              <span>
                <strong>Casualty evacuation</strong> — CCPs & HLZs, corpsmen by part, reporting,
                handling, evacuation timeline by echelon of care, MASCAL, enemy casualties.{' '}
                <Pts n={4} />
              </span>
              <button
                type="button"
                className="chip chip-solid"
                onClick={() => onNavigate('casevac')}
              >
                <Ambulance size={11} /> BUILD IT
              </button>
            </span>
          }
        />
        <LeafItem
          letter="b"
          text={
            <span>
              <strong>EPWs & detainees</strong> — 5 S's & T (search, silence, segregate, safeguard,
              speed, tag), reporting, holding area, handoff. <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="c"
          text={
            <span>
              <strong>Chow & water</strong> — initial issue, amount on each person (on and off
              camp), resupply. <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="d"
          text={
            <span>
              <strong>Ammunition</strong> — initial issue by unit, amount maintained, resupply.{' '}
              <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="e"
          text={
            <span>
              <strong>Special equipment</strong> — CESE and tools: type, who controls, who can
              request. <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="f"
          text={
            <span>
              <strong>Construction materials</strong> — type and control. <Pts n={2} />
            </span>
          }
        />
        <LeafItem
          letter="g"
          text={
            <span>
              <strong>Fuel & batteries</strong> — initial issue by unit, resupply. <Pts n={2} />
            </span>
          }
        />
        <Callout kind="tip">
          “Who's in charge? Who can request?” — answer both for every resupply line.
        </Callout>
        <InlineNotes id="osmeac-a" label="Admin & Logistics" />
      </Block>

      {/* ===== 5. COMMAND & SIGNAL ===== */}
      <Block
        theme="command"
        letter="5"
        kicker="¶5 · 7 PTS"
        name="COMMAND & SIGNAL"
        desc="Execution checklist, PACE, no-comms, challenge & pass, succession"
      >
        <LeafItem
          letter="S"
          text={
            <span>
              <strong>Signal</strong> — frequencies/channels, call signs, PACE signal plan (account
              for pyro), no-comms plan, challenge & pass from D-Day to D+3. <Pts n={5} />
            </span>
          }
        />
        <LeafItem
          letter="C"
          text={
            <span>
              <strong>Command</strong> — succession of command and key leader locations, by part.{' '}
              <Pts n={2} />
            </span>
          }
        />
        <Callout kind="note" title="Challenge & pass, decoded">
          Primary: a challenge word and a password. Alternate: “numbers to 13” — the challenger says
          6, you answer 7. Running: one word said three times when you must get through lines fast.
          Night: an IR flash count.
        </Callout>
        <InlineNotes id="osmeac-c" label="Command & Signal" />
      </Block>

      <Block theme="ref" letter={<IconStopwatch />} name="TIME HACK" desc="How every brief ends">
        <Info>
          Close by synchronizing watches: “The time will be 0912 in ten seconds… five, four, three,
          two, one — HACK.”
        </Info>
      </Block>

      <NotesBlock sectionKey="smeac" label="ORDER" />
    </div>
  );
};

export default OrderView;
