"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useUserStore } from "@/stores/user-store";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const navItems = [
  { href: "/", label: "首页" },
  { href: "/profile", label: "个人资料" },
  { href: "/resource/new", label: "新建资源" },
  { href: "/resource/list", label: "资源列表" },
  { href: "/match/list", label: "匹配列表" }
];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const token = useUserStore((state) => state.getValidToken());
  const role = useUserStore((state) => state.role);
  const phone = useUserStore((state) => state.phone);
  const logout = useUserStore((state) => state.logout);

  const loggedIn = Boolean(token);
  const userInitial = useMemo(() => {
    if (!phone) {
      return "U";
    }
    return phone.slice(-2).toUpperCase();
  }, [phone]);

  function onLogout() {
    logout();
    toast({
      title: "已退出登录",
      description: "当前登录态已清除。"
    });
  }

  return (
    <header className="sticky top-3 z-40 mb-6">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
                        variant={pathname === item.href ? "default" : "ghost"}
                        className="justify-start"
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </Button>
                    </DrawerClose>
                  ))}
                  {loggedIn ? (
                    <Button variant="destructive" onClick={onLogout} className="mt-2 justify-start">
                      退出登录
                    </Button>
                  ) : (
                    <DrawerClose asChild>
                      <Button asChild className="mt-2 justify-start">
                        <Link href="/auth">登录/注册</Link>
                      </Button>
                    </DrawerClose>
                  )}
                </nav>
              </DrawerContent>
            </Drawer>

            <Link
              href="/"
              className="rounded-md px-2 py-1 text-sm font-semibold tracking-wide text-primary"
            >
              Busy as a Shrimp
            </Link>

            {loggedIn ? <Badge variant="secondary">{getRoleLabel(role)}</Badge> : null}
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant={pathname === item.href ? "default" : "ghost"}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {loggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      {maskPhone(phone)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4" />
                    {maskPhone(phone)}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">个人资料</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/resource/new">新建资源</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/match/list">匹配列表</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>退出登录</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/auth">登录/注册</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
