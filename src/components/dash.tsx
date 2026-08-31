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
    <header className="mb-5 border-b border-border pb-4 sm:mb-6 sm:pb-5">
      <div className="label-caps text-teal">{eyebrow}</div>
      <h1 className="mt-1.5 text-lg font-semibold text-foreground sm:text-2xl">{title}</h1>
      {subtitle ? (
        <p className="mt-1.5 max-w-3xl text-[13px] text-muted-foreground sm:text-sm">{subtitle}</p>
      ) : null}
    </header>
  );
}

export function TableWrap({
  children,
  minWidth = 640,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}


export function Panel({
  title,
  hint,
  actions,
  children,
  className = "",
  bodyClassName = "p-4 sm:p-5",
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel min-w-0 overflow-hidden ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
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
    <div className="panel min-w-0 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="label-caps">{label}</div>
      <div className={`tabular mt-1.5 text-xl font-semibold break-words sm:mt-2 sm:text-2xl ${toneCls}`}>
        {value}
      </div>
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
