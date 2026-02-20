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
    <Sidebar className="border-sidebar-border">

      <SidebarHeader className="relative border-b border-sidebar-border">
        <div className="flex flex-col gap-4 px-2 py-6">
          <div className="flex items-center gap-4 px-3 py-4 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent/60 transition-all duration-200 hover:-translate-y-px">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground shadow-md">
              <Github className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">
                Connected Account
              </p>
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                @{userName}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="relative px-2 py-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground px-3 mb-3 uppercase tracking-widest">
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
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md"
                    : "hover:bg-sidebar-accent hover:-translate-y-px text-sidebar-foreground"
                }`}
              >
                <Link href={item.url} className="flex items-center gap-3 cursor-pointer">
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator className="bg-sidebar-border" />

      <SidebarFooter className="relative p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-lg p-2 border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent transition-all duration-200 hover:-translate-y-px cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image || undefined} alt={userName} />
                <AvatarFallback className="bg-muted text-muted-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 border-border bg-popover text-popover-foreground backdrop-blur-md">
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="cursor-pointer hover:bg-accent focus:bg-accent">
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </DropdownMenuItem>
            <Logout className="w-full justify-start gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors" variant="ghost" size="sm">
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
