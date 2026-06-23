import Link from "next/link";

type AppCard = {
  title: string;
  description: string;
  href?: string;
  tag: string;
  status: "active" | "soon";
};

const activeApps: AppCard[] = [
  {
    title: "Trading Dashboard",
    description: "Theo dõi MT5 accounts, balance, equity, PNL, commission, final profit và health check.",
    href: "/dashboard",
    tag: "MT5 Performance",
    status: "active",
  },
  {
    title: "Finance Dashboard",
    description: "Quản lý capital base từng khách, settlement theo tháng, client profit và manager profit.",
    href: "/dashboard/finance",
    tag: "Money Flow",
    status: "active",
  },
];

const comingSoonApps: AppCard[] = [
  {
    title: "Monthly Reports",
    description: "Xuất báo cáo chốt tháng cho từng khách hàng sau khi settlement đã locked/paid.",
    tag: "Coming Soon",
    status: "soon",
  },
  {
    title: "Client Statements",
    description: "Không gian lưu statement theo từng khách, gồm vốn, PNL, lợi nhuận khách và phần manager.",
    tag: "Coming Soon",
    status: "soon",
  },
  {
    title: "Personal Blog",
    description: "Không gian lưu nội dung cá nhân, notes, trading journal và tài liệu vận hành.",
    tag: "Coming Soon",
    status: "soon",
  },
  {
    title: "System Admin",
    description: "Khu vực quản trị nâng cao cho API, health status, database và automation.",
    tag: "Coming Soon",
    status: "soon",
  },
];

function StatusPill({ status }: { status: AppCard["status"] }) {
  if (status === "active") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
      Soon
    </span>
  );
}

function AppCardView({ app }: { app: AppCard }) {
  const card = (
    <div className="group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {app.tag}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">{app.title}</h2>
        </div>
        <StatusPill status={app.status} />
      </div>

      <p className="min-h-[72px] text-sm leading-6 text-slate-600">{app.description}</p>

      <div className="mt-7 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">
          {app.href ? "Open dashboard" : "Not available yet"}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-lg text-white transition group-hover:translate-x-1">
          {app.href ? "→" : "·"}
        </span>
      </div>
    </div>
  );

  if (!app.href) {
    return <div className="opacity-75">{card}</div>;
  }

  return <Link href={app.href}>{card}</Link>;
}

export default function HomePage() {
  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 sm:px-8 lg:px-10">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Dam Quang Loc Workspace
              </p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Overview
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Trung tâm truy cập nhanh các dashboard và module vận hành cá nhân. Chọn khu vực bạn muốn mở bên dưới.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Today</p>
              <p>{today}</p>
            </div>
          </div>
        </header>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Live dashboards</h2>
              <p className="mt-1 text-sm text-slate-500">Các khu vực đang hoạt động và có thể truy cập ngay.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {activeApps.map((app) => (
              <AppCardView key={app.title} app={app} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Planned modules</h2>
              <p className="mt-1 text-sm text-slate-500">Các khu vực có thể mở rộng sau, hiện để làm roadmap.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {comingSoonApps.map((app) => (
              <AppCardView key={app.title} app={app} />
            ))}
          </div>
        </section>

        <footer className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} Đàm Quang Lộc. Personal operation hub.</p>
            <p className="font-medium text-slate-700">Trading · Finance · Reports · Personal Workspace</p>
          </div>
        </footer>
      </section>
    </main>
  );
}
