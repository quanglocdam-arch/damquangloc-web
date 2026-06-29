export type ModuleStatus = "Active" | "Building" | "Coming soon";

export type SiteModule = {
  title: string;
  description: string;
  href: string;
  status: ModuleStatus;
  category: "Working" | "Workout" | "Sharing";
  eyebrow?: string;
};

export const siteSections = [
  {
    title: "Working",
    href: "/working",
    description: "Trading dashboards, commission tracking, and business workspaces.",
    modules: [
      {
        title: "MT5 Trading Dashboard",
        description: "Monitor trading performance, account balances, PNL, and copy-trade health.",
        href: "/working/mt5",
        status: "Active",
        category: "Working",
        eyebrow: "Trading",
      },
      {
        title: "Commission Dashboard",
        description: "Separate dashboard for partner commission and payout tracking.",
        href: "/working/commission",
        status: "Building",
        category: "Working",
        eyebrow: "Finance",
      },
    ],
  },
  {
    title: "Workout",
    href: "/workout",
    description: "Running, workout logs, training progress, and fitness dashboards.",
    modules: [
      {
        title: "Strava Running Dashboard",
        description: "Running activity, weekly mileage, pace trends, splits, and lap analysis.",
        href: "/workout/strava",
        status: "Building",
        category: "Workout",
        eyebrow: "Running",
      },
    ],
  },
  {
    title: "Sharing",
    href: "/sharing",
    description: "Blog, notes, personal writing, case studies, and public sharing.",
    modules: [
      {
        title: "Blog",
        description: "Personal articles, project notes, marketing learnings, and life updates.",
        href: "/sharing/blog",
        status: "Coming soon",
        category: "Sharing",
        eyebrow: "Writing",
      },
    ],
  },
] as const;

export const allModules: SiteModule[] = siteSections.flatMap((section) => section.modules);
