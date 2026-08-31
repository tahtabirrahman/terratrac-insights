import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 border-b border-border pb-5">
      <div className="label-caps text-teal">{eyebrow}</div>
      <h1 className="mt-1.5 text-2xl font-semibold text-foreground">{title}</h1>
      {subtitle ? (
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}

export function Panel({
  title,
  hint,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "risk" | "good" | "warn";
}) {
  const toneCls =
    tone === "risk"
      ? "text-risk"
      : tone === "good"
        ? "text-good"
        : tone === "warn"
          ? "text-warn"
          : "text-foreground";
  return (
    <div className="panel px-5 py-4">
      <div className="label-caps">{label}</div>
      <div className={`tabular mt-2 text-2xl font-semibold ${toneCls}`}>{value}</div>
      {delta ? <div className="mt-1 text-xs text-muted-foreground">{delta}</div> : null}
    </div>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
