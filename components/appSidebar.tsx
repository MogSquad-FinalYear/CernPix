"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Flag, Folder, ImageUp, MoonStar, SunMedium } from "lucide-react";

const navigationItems = [
  { title: "Add Images", href: "/", icon: ImageUp },
  { title: "All Files", href: "/all-files", icon: Folder },
  //   { title: "Flagged", href: "/flagged", icon: Flag },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const preferredTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(preferredTheme);
    document.documentElement.classList.toggle(
      "dark",
      preferredTheme === "dark",
    );
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="text-2xl font-semibold">CernPix</div>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {theme === "dark" ? (
              <SunMedium className="size-4" />
            ) : (
              <MoonStar className="size-4" />
            )}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map(({ title, href, icon: Icon }) => {
              const isActive = pathname === href;

              return (
                <SidebarMenuItem key={title}>
                  <Link
                    href={href}
                    className={[
                      "flex w-full items-center justify-start gap-3 rounded-md px-3 py-3 text-left text-base font-medium transition-colors",
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    ].join(" ")}
                  >
                    <Icon className="size-5" />
                    <span>{title}</span>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
