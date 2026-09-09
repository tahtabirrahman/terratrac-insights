import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const NAV = [
  { to: "/", label: "Overview" },
  { to: "/forecasting", label: "Demand Forecasting" },
  { to: "/supply-planning", label: "Supply Planning" },
  { to: "/supplier-risk", label: "Supplier Risk" },
  { to: "/executive-summary", label: "Executive Summary" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TerraTrac Supply Chain Planning Dashboard" },
      {
        name: "description",
        content:
          "Demand forecasting and supply planning dashboard for TerraTrac Equipment Parts: forecasts, inventory risk, and supplier reliability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen w-full overflow-x-hidden bg-background">
        <div className="sticky top-0 z-30 bg-navy text-navy-foreground">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-teal text-[13px] font-bold text-teal-foreground">
                TT
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold sm:text-sm">
                  TerraTrac Equipment Parts
                </div>
                <div className="truncate text-[11px] text-navy-foreground/60">
                  Demand Forecasting &amp; Supply Planning
                </div>
              </div>
            </div>
            <div className="ml-auto hidden shrink-0 text-[11px] text-navy-foreground/60 lg:block">
              Planning cycle · week of 29 Dec 2025 · service level 95%
            </div>
            <div className="ml-auto lg:ml-4">
              <DownloadPdfButton />
            </div>

          </div>
          <nav className="border-t border-white/10">
            <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-2 sm:px-4">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: n.to === "/" }}
                  className="whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[12px] font-medium text-navy-foreground/65 transition-colors hover:text-navy-foreground sm:px-3 sm:text-[13px]"
                  activeProps={{ className: "!border-teal !text-navy-foreground" }}
                >
                  {n.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
        <main className="mx-auto min-w-0 max-w-[1400px] px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-[1400px] px-4 pb-10 text-[11px] text-muted-foreground sm:px-6">
          Synthetic case-study data · 25 SKUs · 4 DCs · 5 suppliers · 104 weeks of weekly
          sell-through
        </footer>
      </div>
    </QueryClientProvider>
  );
}
