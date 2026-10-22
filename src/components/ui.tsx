import React, { useId, useState } from 'react';

export type Theme = 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'slate';

/**
 * Collapsible card. The header is a real <button> (keyboard + screen reader), the body is
 * `inert` while collapsed so hidden textareas drop out of the tab order, and the open/close
 * animation uses grid rows instead of a max-height cap (which used to clip long content).
 */
export const Block = ({
  theme,
  letter,
  name,
  desc,
  kicker,
  children,
  defaultOpen = false,
}: {
  theme: Theme;
  letter: React.ReactNode;
  name: string;
  desc?: string;
  kicker?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={`block theme-${theme} ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        id={`${id}-hdr`}
        className="block-header"
        aria-expanded={isOpen}
        aria-controls={`${id}-body`}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="block-letter" aria-hidden="true">
          {letter}
        </span>
        <span className="block-info">
          {kicker && <span className="block-kicker">{kicker}</span>}
          <span className="block-name">{name}</span>
          {desc && <span className="block-desc">{desc}</span>}
        </span>
        <span className="block-chevron" aria-hidden="true">
          ▸
        </span>
      </button>
      <div
        id={`${id}-body`}
        className="block-body"
        role="region"
        aria-labelledby={`${id}-hdr`}
        inert={!isOpen}
      >
        <div className="block-clip">
          <div className="block-content">{children}</div>
        </div>
      </div>
    </section>
  );
};

export const SubBlock = ({
  theme,
  letter,
  name,
  children,
  defaultOpen = false,
}: {
  theme: Theme;
  letter: React.ReactNode;
  name: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={`sub-block theme-${theme} ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        id={`${id}-hdr`}
        className="sub-header"
        aria-expanded={isOpen}
        aria-controls={`${id}-body`}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span className="sub-letter" aria-hidden="true">
          {letter}
        </span>
        <span className="sub-name">{name}</span>
        <span className="sub-chevron" aria-hidden="true">
          ▸
        </span>
      </button>
      <div
        id={`${id}-body`}
        className="sub-body"
        role="region"
        aria-labelledby={`${id}-hdr`}
        inert={!isOpen}
      >
        <div className="block-clip">
          <div className="sub-content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const LeafItem = ({ letter, text }: { letter: React.ReactNode; text: React.ReactNode }) => (
  <div className="leaf-item">
    <div className="leaf-letter">{letter}</div>
    <div className="leaf-text">{text}</div>
  </div>
);

export type CalloutKind = 'example' | 'tip' | 'pitfall' | 'note' | 'grader';

const CALLOUT_LABEL: Record<CalloutKind, string> = {
  example: 'EXAMPLE',
  tip: 'INSTRUCTOR TIP',
  pitfall: 'COMMON MISTAKE',
  note: 'NOTE',
  grader: 'GRADED',
};

/**
 * Labeled aside. `example` is for text quoted from a past course exercise — it keeps
 * scenario specifics out of the doctrine copy and marks them as examples.
 */
export const Callout = ({
  kind,
  title,
  children,
}: {
  kind: CalloutKind;
  title?: string;
  children: React.ReactNode;
}) => (
  <div className={`callout callout-${kind}`}>
    <div className="callout-label">
      {CALLOUT_LABEL[kind]}
      {title && <span className="callout-title"> · {title}</span>}
    </div>
    <div className="callout-body">{children}</div>
  </div>
);

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="section-label">{children}</div>
);

/** A small "what goes here" paragraph shown above a notes field. */
export const Info = ({ children }: { children: React.ReactNode }) => (
  <div className="info-text">{children}</div>
);
