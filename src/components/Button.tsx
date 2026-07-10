import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Aurora Cyan is the single CTA colour sitewide (PDR §4.2).
 * primary  — cyan pill, navy text; hover → Electric Blue.
 * secondary — silver hairline outline; hover → cyan border/text.
 * quiet    — text + arrow, for tertiary actions.
 */
type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-heading font-semibold transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan text-navy hover:bg-blue active:bg-blue shadow-[0_0_24px_rgba(43,217,245,0.25)]",
  secondary:
    "border border-silver/40 text-starlight hover:border-cyan hover:text-cyan",
  quiet: "text-cyan hover:text-blue underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-4 py-2",
  md: "text-base px-6 py-3",
  lg: "text-lg px-8 py-4",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const cls = (v: Variant, s: Size, c: string) =>
    `${base} ${variants[v]} ${sizes[s]} ${c}`;

  if (typeof props.href === "string") {
    const { href, variant = "primary", size = "md", className = "", children } = props;
    return (
      <Link href={href} className={cls(variant, size, className)}>
        {children}
      </Link>
    );
  }

  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
    href: _href,
    ...rest
  } = props;
  void _href;
  return (
    <button {...rest} className={cls(variant, size, className)}>
      {children}
    </button>
  );
}
