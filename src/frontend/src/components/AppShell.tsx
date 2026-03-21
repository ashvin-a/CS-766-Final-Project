import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  Play,
  Images,
  Cpu,
  Package,
  BarChart3,
  Settings,
  Activity,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Separator } from "./ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet"
import { useState, useEffect } from "react"
import { getBackendHealth } from "@/lib/api"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/new-run", icon: Play, label: "New Run" },
  { to: "/dataset-studio", icon: Images, label: "Dataset Studio" },
  { to: "/training-runs", icon: Cpu, label: "Training Runs" },
  { to: "/models", icon: Package, label: "Models" },
  { to: "/results", icon: BarChart3, label: "Results" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

export function AppShell() {
  const [health, setHealth] = useState<{ status: string; gpuAvailable?: boolean } | null>(null)

  useEffect(() => {
    getBackendHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "unavailable" }))
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-col border-r bg-card/50 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-semibold">Prompt-to-Model</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Separator />
        <div className="flex items-center justify-between p-3">
          <ThemeToggle />
          {health && (
            <Badge
              variant={health.status === "ok" ? "success" : "destructive"}
              className="text-xs"
            >
              {health.status === "ok" ? "Online" : "Offline"}
              {health.gpuAvailable && " · GPU"}
            </Badge>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Prompt-to-Model
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-semibold">Prompt-to-Model</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {health && (
              <Badge variant={health.status === "ok" ? "success" : "destructive"}>
                {health.status}
              </Badge>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
