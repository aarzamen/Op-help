import React, { useId } from 'react';

/** Compact labeled inputs for the planning forms (CASEVAC, tasking builder, order header). */

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  multiline?: boolean;
  hint?: string;
}) => {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className={`field-input field-multiline ${mono ? 'field-mono' : ''}`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className={`field-input ${mono ? 'field-mono' : ''}`}
          value={value}
          placeholder={placeholder}
          autoCapitalize={mono ? 'characters' : undefined}
          spellCheck={mono ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
};

export const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) => {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        {unit && <span className="field-unit"> ({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className="field-input field-mono"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = e.target.value === '' ? 0 : Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
};

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="field-input"
        value={String(value)}
        onChange={(e) => {
          const hit = options.find((o) => String(o.value) === e.target.value);
          if (hit) onChange(hit.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const CheckGroup = ({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
}) => (
  <fieldset className="field">
    <legend className="field-label">{label}</legend>
    <div className="check-row">
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={`toggle-chip ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? values.filter((v) => v !== o) : [...values, o])}
          >
            {o}
          </button>
        );
      })}
    </div>
  </fieldset>
);

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          className={`segment ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Two-up grid for short fields on wide screens; stacks on narrow phones. */
export const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <div className="field-row">{children}</div>
);
