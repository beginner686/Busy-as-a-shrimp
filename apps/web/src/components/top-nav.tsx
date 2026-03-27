"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, ListChecks, LogIn, LogOut, Menu, Plus, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStatus } from "@/stores/use-auth-status";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MATCH_LIST_QUERY_KEY,
  fetchMatchListQueryData
} from "@/features/match-list/match-list-feature";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const publicNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/resource/list", label: "资源列表", icon: List }
] as const;

const authNavItems = [{ href: "/match/list", label: "匹配列表", icon: ListChecks }] as const;

function getRoleLabel(role: "service" | "resource" | "both"): string {
  if (role === "service") {
    return "服务方";
  }
  if (role === "resource") {
    return "资源方";
  }
  return "双角色";
}

function maskPhone(phone: string): string {
  if (!phone) {
    return "未绑定手机号";
  }
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hydrated, isLoggedIn, role, phone, logout } = useAuthStatus();

  const loggedIn = hydrated && isLoggedIn;
  const navItems = loggedIn ? [...publicNavItems, ...authNavItems] : publicNavItems;

  const userInitial = useMemo(() => {
    if (!phone) {
      return "虾";
    }
    return phone.slice(-2);
  }, [phone]);

  function isActivePath(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function onLogout() {
    logout();
    setDrawerOpen(false);
    toast({
      title: "已退出登录",
      description: "当前登录态已清除。"
    });
    router.replace("/");
  }

  function prefetchMatchListOnIntent() {
    if (!loggedIn) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: MATCH_LIST_QUERY_KEY,
      queryFn: fetchMatchListQueryData,
      staleTime: 45_000
    });
  }

  return (
    <header className="sticky top-0 z-50 mb-6 border-b border-white/20 bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="md:hidden">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-white/30 bg-white/70 text-zinc-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-zinc-100/70 hover:text-zinc-900 md:hidden"
                  aria-label="打开导航菜单"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-white/40 bg-white/85 backdrop-blur-xl">
                <DrawerHeader>
                  <DrawerTitle>导航菜单</DrawerTitle>
                </DrawerHeader>
                <nav className="grid gap-2 px-4 pb-4" aria-label="移动端导航">
                  {navItems.map((item) => (
                    <DrawerClose asChild key={item.href}>
                      <Button
                        asChild
                        variant={isActivePath(item.href) ? "default" : "ghost"}
                        className={cn(
                          "justify-start rounded-full transition-all duration-200 ease-out",
                          isActivePath(item.href)
                            ? "bg-zinc-900 text-white shadow-sm"
                            : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
                        )}
                      >
                        <Link
                          href={item.href}
                          onMouseEnter={
                            item.href === "/match/list" ? prefetchMatchListOnIntent : undefined
                          }
                          onFocus={
                            item.href === "/match/list" ? prefetchMatchListOnIntent : undefined
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </Button>
                    </DrawerClose>
                  ))}
                  {loggedIn ? (
                    <>
                      <DrawerClose asChild>
                        <Button
                          asChild
                          className="mt-2 justify-start rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md"
                        >
                          <Link href="/resource/new">
                            <Plus className="h-4 w-4" />
                            发布资源
                          </Link>
                        </Button>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className="justify-start rounded-full text-zinc-600 transition-all duration-200 ease-out hover:bg-zinc-100/70 hover:text-zinc-900"
                        >
                          <Link href="/profile">
                            <UserCircle2 className="h-4 w-4" />
                            个人资料
                          </Link>
                        </Button>
                      </DrawerClose>
                      <Button
                        variant="ghost"
                        onClick={onLogout}
                        className="justify-start rounded-full text-zinc-600 transition-all duration-200 ease-out hover:bg-rose-50 hover:text-rose-600"
                      >
                        <LogOut className="h-4 w-4" />
                        退出登录
                      </Button>
                    </>
                  ) : (
                    <DrawerClose asChild>
                      <Button
                        asChild
                        className="mt-2 justify-start rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-zinc-50"
                      >
                        <Link href="/auth">
                          <LogIn className="h-4 w-4" />
                          登录 / 注册
                        </Link>
                      </Button>
                    </DrawerClose>
                  )}
                </nav>
              </DrawerContent>
            </Drawer>
          </div>

          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-lg font-bold tracking-tighter text-zinc-900 transition-all duration-200 ease-out hover:bg-zinc-100/60"
          >
            <span className="bg-gradient-to-b from-zinc-900 to-zinc-700 bg-clip-text text-transparent">
              虾忙
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={item.href === "/match/list" ? prefetchMatchListOnIntent : undefined}
                onFocus={item.href === "/match/list" ? prefetchMatchListOnIntent : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-all duration-200 ease-out hover:bg-zinc-100/50 hover:text-zinc-900",
                  isActivePath(item.href) &&
                    "bg-white/75 text-zinc-900 shadow-sm ring-1 ring-zinc-200/70"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <>
              <Button
                asChild
                className="hidden rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md sm:inline-flex"
              >
                <Link href="/resource/new">
                  <Plus className="h-4 w-4" />
                  发布资源
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 rounded-full border border-white/30 bg-white/70 px-2 text-zinc-700 shadow-sm transition-all duration-200 ease-out hover:bg-zinc-100/70 hover:text-zinc-900"
                  >
                    <Avatar className="h-8 w-8 border border-zinc-200/80">
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm text-zinc-600 sm:inline">
                      {maskPhone(phone)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-white/40 bg-white/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl"
                >
                  <DropdownMenuLabel className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle2 className="h-4 w-4" />
                      {maskPhone(phone)}
                    </div>
                    <p className="text-xs font-normal text-zinc-500">{getRoleLabel(role)}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <UserCircle2 className="h-4 w-4" />
                      个人资料
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-zinc-600 focus:bg-rose-50 focus:text-rose-600"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              asChild
              className="rounded-full border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-zinc-50"
            >
              <Link href="/auth">
                <LogIn className="h-4 w-4" />
                登录 / 注册
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
