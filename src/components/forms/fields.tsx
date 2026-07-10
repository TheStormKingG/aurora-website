/**
 * Form primitives with error states (M1). Conventions:
 * - Fields are required by default; OPTIONAL fields are explicitly
 *   badged, per PDR §8.1 (optional fields clearly marked).
 * - Errors bind via aria-describedby; error colour is a system utility
 *   outside the brand accent set so it can never be mistaken for a CTA.
 * - Works on dark surfaces (default) — booking + privacy forms live on
 *   Midnight Indigo cards.
 */

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlBase =
  "w-full rounded-lg border bg-navy/60 px-4 py-3 text-base text-starlight placeholder:text-silver/50 transition-colors border-silver/30 hover:border-silver/50 focus:border-cyan";
const controlError = "border-[#ff9db0] focus:border-[#ff9db0]";

export function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-starlight">
      {children}
      {optional ? (
        <span className="rounded-full border border-silver/30 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-silver">
          Optional
        </span>
      ) : null}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-[#ff9db0]">
      {children}
    </p>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-silver/80">
      {children}
    </p>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: ReactNode;
  optional?: boolean;
  error?: string;
  hint?: string;
};

export function TextField({ id, label, optional, error, hint, ...rest }: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={!optional}
        className={`${controlBase} ${error ? controlError : ""}`}
        {...rest}
      />
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: ReactNode;
  optional?: boolean;
  error?: string;
  hint?: string;
};

export function TextAreaField({ id, label, optional, error, hint, ...rest }: TextAreaFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={!optional}
        className={`${controlBase} resize-y ${error ? controlError : ""}`}
        {...rest}
      />
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: ReactNode;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function SelectField({ id, label, optional, error, hint, children, ...rest }: SelectFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={!optional}
        className={`${controlBase} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23C9D3E0%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.1rem] bg-[position:right_1rem_center] bg-no-repeat pr-11 ${error ? controlError : ""}`}
        {...rest}
      >
        {children}
      </select>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: ReactNode;
  error?: string;
};

export function CheckboxField({ id, label, error, ...rest }: CheckboxFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border border-silver/40 bg-navy/60 transition-colors checked:border-cyan checked:bg-cyan checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23060B22%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m5%2012.5%205%205%209-11%22%2F%3E%3C%2Fsvg%3E')] checked:bg-[length:0.9rem] checked:bg-center checked:bg-no-repeat"
          {...rest}
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-silver">
          {label}
        </label>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/** Radio-card group used by the booking flow steps. */
export function RadioCard({
  name,
  value,
  id,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  id: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        checked
          ? "border-cyan bg-cyan/10"
          : "border-silver/25 bg-navy/40 hover:border-silver/50"
      }`}
    >
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1.5 h-4 w-4 shrink-0 appearance-none rounded-full border border-silver/50 transition-colors checked:border-[5px] checked:border-cyan"
      />
      <span>
        <span className="block font-heading font-semibold text-starlight">{title}</span>
        {description ? <span className="mt-0.5 block text-sm text-silver">{description}</span> : null}
      </span>
    </label>
  );
}
