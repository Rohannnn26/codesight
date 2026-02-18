"use client"

import {
  BookOpen,
  Github,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { useSession } from "@/lib/auth-client"
import Logout from "@/modules/auth/components/logout"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavigationItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BookOpen,
  },
  {
    title: "Repository",
    url: "/dashboard/repository",
    icon: Github,
  },
  {
    title: "Reviews",
    url: "/dashboard/reviews",
    icon: BookOpen,
  },
  {
    title: "Subscription",
    url: "/dashboard/subscription",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

const AppSidebar = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  const { data: session } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`)
  }

  if (!mounted || !session) return null

  const user = session.user
  const userName = user?.name || "GUEST"
  const userEmail = user?.email || ""
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sidebar className="relative overflow-hidden border-r border-zinc-800/70 bg-gradient-to-b from-zinc-950 via-zinc-900 to-neutral-900 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-zinc-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-4 -right-20 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl animate-pulse [animation-delay:900ms]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.04),transparent_45%)]" />
      </div>

      <SidebarHeader className="relative border-b border-zinc-800/70">
        <div className="flex flex-col gap-4 px-2 py-6">
          <div className="flex items-center gap-4 px-3 py-4 rounded-lg border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-700/45 transition-all duration-200 hover:-translate-y-[1px]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-200 text-zinc-900 shadow-[0_0_24px_rgba(212,212,216,0.22)]">
              <Github className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-300 tracking-wide">
                Connected Account
              </p>
              <p className="text-sm font-medium text-zinc-100 truncate">
                @{userName}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="relative px-2 py-4">
        <div>
          <p className="text-xs font-semibold text-zinc-400 px-3 mb-3 uppercase tracking-widest">
            Menu
          </p>
        </div>

        <SidebarMenu className="gap-2">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={`h-11 px-4 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive(item.url)
                    ? "bg-zinc-100 text-zinc-900 font-semibold shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_8px_24px_rgba(0,0,0,0.25)]"
                    : "hover:bg-zinc-800/70 hover:-translate-y-[1px] text-zinc-200"
                }`}
              >
                <Link href={item.url} className="flex items-center gap-3 cursor-pointer">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator className="bg-zinc-800/70" />

      <SidebarFooter className="relative p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-lg p-2 border border-transparent hover:border-zinc-700/60 hover:bg-zinc-800/70 transition-all duration-200 hover:-translate-y-[1px] cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image || undefined} alt={userName} />
                <AvatarFallback className="bg-zinc-300 text-zinc-900">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-zinc-100 truncate">{userName}</p>
                <p className="text-xs text-zinc-400 truncate">{userEmail}</p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 border-zinc-700/80 bg-zinc-900/95 text-zinc-100 backdrop-blur-md">
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="cursor-pointer hover:bg-zinc-800/80 focus:bg-zinc-800/80">
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </DropdownMenuItem>
            <Logout className="w-full justify-start gap-2 px-2 py-1.5 text-sm rounded-md text-zinc-100 hover:bg-zinc-800/80 transition-colors" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
              Logout
            </Logout>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
