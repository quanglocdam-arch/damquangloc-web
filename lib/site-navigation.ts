export type ModuleStatus = 'Active' | 'Building' | 'Planned';

export type SiteModule = {
  title: string;
  description: string;
  href: string;
  status: ModuleStatus;
  category: 'Working' | 'Workout' | 'Sharing';
  eyebrow: string;
};

export type SiteSection = {
  title: string;
  description: string;
  href: string;
  modules: SiteModule[];
};

export const siteSections: SiteSection[] = [
  {
    title: 'Working',
    description:
      'Trading performance, commission tracking, finance workspace, and business dashboards.',
    href: '/working',
    modules: [
      {
        title: 'MT5 Trading Dashboard',
        description:
          'Monitor trading performance, account balances, PNL, and copy-trade health.',
        href: '/working/mt5',
        status: 'Active',
        category: 'Working',
        eyebrow: 'Trading',
      },
      {
        title: 'Commission Dashboard',
        description:
          'Separate dashboard for partner commission and payout tracking.',
        href: '/working/commission',
        status: 'Active',
        category: 'Working',
        eyebrow: 'Finance',
      },
      {
        title: 'Finance Dashboard',
        description:
          'Client finance workspace, monthly overview, trading PNL, and settlements.',
        href: '/working/finance',
        status: 'Active',
        category: 'Working',
        eyebrow: 'Finance',
      },
    ],
  },
  {
    title: 'Workout',
    description:
      'Running, health, and training dashboards separated from work data.',
    href: '/workout',
    modules: [
      {
        title: 'Strava Running Dashboard',
        description:
          'Running activity, weekly mileage, pace trends, splits, and lap analysis.',
        href: '/workout/strava',
        status: 'Building',
        category: 'Workout',
        eyebrow: 'Running',
      },
    ],
  },
  {
    title: 'Sharing',
    description:
      'Blog, notes, and personal knowledge sharing.',
    href: '/sharing',
    modules: [
      {
        title: 'Blog',
        description:
          'Personal writing, updates, and notes.',
        href: '/sharing/blog',
        status: 'Planned',
        category: 'Sharing',
        eyebrow: 'Writing',
      },
    ],
  },
];

export const allModules: SiteModule[] = siteSections.flatMap(
  (section) => section.modules
);
