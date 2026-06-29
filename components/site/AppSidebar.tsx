"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";
import { siteSections } from "@/lib/site-navigation";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/">
        <div className={styles.brandMark}>L</div>
        <div>
          <p className={styles.brandTitle}>Đàm Quang Lộc</p>
          <p className={styles.brandSubtitle}>Personal command center</p>
        </div>
      </Link>

      <nav aria-label="Main navigation">
        <div className={styles.navGroup}>
          <Link
            href="/"
            className={`${styles.navItem} ${isActive(pathname, "/") ? styles.navItemActive : ""}`}
          >
            <span>Overview</span>
          </Link>
        </div>

        {siteSections.map((section) => (
          <div className={styles.navGroup} key={section.title}>
            <p className={styles.navGroupTitle}>{section.title}</p>
            <Link
              href={section.href}
              className={`${styles.navItem} ${isActive(pathname, section.href) ? styles.navItemActive : ""}`}
            >
              <span>{section.title} Home</span>
              <span className={styles.navBadge}>{section.modules.length}</span>
            </Link>
            {section.modules.map((module) => (
              <Link
                href={module.href}
                key={module.href}
                className={`${styles.navItem} ${isActive(pathname, module.href) ? styles.navItemActive : ""}`}
              >
                <span>{module.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
