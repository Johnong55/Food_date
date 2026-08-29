"use client";

import {
  Compass,
  HeartHandshake,
  Home,
  UserRound,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/matches", label: "Matches", icon: HeartHandshake },
  { href: "/saved", label: "Saved", icon: Utensils },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-border/70 bg-background/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-24px_rgba(40,25,20,0.5)] backdrop-blur-xl"
    >
      <ul className="grid h-17 grid-cols-5 px-2">
        {navigationItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === href : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5", isActive && "fill-primary/15")}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
