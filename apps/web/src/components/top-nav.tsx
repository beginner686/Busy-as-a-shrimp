"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, ListChecks, LogIn, LogOut, Menu, Plus, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useUserStore } from "@/stores/user-store";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const token = useUserStore((state) => state.token);
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt);
  const role = useUserStore((state) => state.role);
  const phone = useUserStore((state) => state.phone);
  const logout = useUserStore((state) => state.logout);

  const loggedIn = Boolean(token) && Date.now() < tokenExpiresAt;
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

  return (
    <header className="sticky top-0 z-40 mb-6 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="md:hidden">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="打开导航菜单"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>导航菜单</DrawerTitle>
                </DrawerHeader>
                <nav className="grid gap-2 px-4 pb-4" aria-label="移动端导航">
                  {navItems.map((item) => (
                    <DrawerClose asChild key={item.href}>
                      <Button
                        asChild
                        variant={isActivePath(item.href) ? "default" : "ghost"}
                        className="justify-start"
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </Button>
                    </DrawerClose>
                  ))}
                  {loggedIn ? (
                    <>
                      <DrawerClose asChild>
                        <Button asChild className="mt-2 justify-start">
                          <Link href="/resource/new">
                            <Plus className="h-4 w-4" />
                            发布资源
                          </Link>
                        </Button>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Button asChild variant="ghost" className="justify-start">
                          <Link href="/profile">
                            <UserCircle2 className="h-4 w-4" />
                            个人资料
                          </Link>
                        </Button>
                      </DrawerClose>
                      <Button variant="destructive" onClick={onLogout} className="justify-start">
                        <LogOut className="h-4 w-4" />
                        退出登录
                      </Button>
                    </>
                  ) : (
                    <DrawerClose asChild>
                      <Button asChild className="mt-2 justify-start">
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
            className="rounded-md px-2 py-1 text-sm font-semibold tracking-wide text-primary"
          >
            虾忙
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  isActivePath(item.href) &&
                    "text-foreground underline underline-offset-8 decoration-2"
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
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/resource/new">
                  <Plus className="h-4 w-4" />
                  发布资源
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 px-2">
                    <Avatar className="h-8 w-8 border border-border/70">
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      {maskPhone(phone)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle2 className="h-4 w-4" />
                      {maskPhone(phone)}
                    </div>
                    <p className="text-xs font-normal text-muted-foreground">
                      {getRoleLabel(role)}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <UserCircle2 className="h-4 w-4" />
                      个人资料
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
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
