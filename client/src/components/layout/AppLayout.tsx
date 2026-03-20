import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Network,
  CheckSquare,
  MessageSquare,
  Plug,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/ai-staff", label: "AI Staff", icon: Users },
  { path: "/workflows", label: "Workflows", icon: GitBranch },
  { path: "/delegations", label: "Delegations", icon: Network },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/integrations", label: "Integrations", icon: Plug },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="animate-pulse-glow rounded-lg p-1">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">SmartPromptIQ</span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-[1.02] hover:border-l-2 hover:border-primary/40 border-l-2 border-transparent"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          {/* Left: mobile menu button */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                SmartPromptIQ
              </span>
            </div>
          </div>

          {/* Center: workspace selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground hover:bg-secondary/80 transition-colors"
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            >
              <span className="max-w-[150px] truncate">
                {currentWorkspace?.name || "Select workspace"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {wsDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setWsDropdownOpen(false)}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      className={cn(
                        "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
                        ws.id === currentWorkspace?.id
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-secondary"
                      )}
                      onClick={() => {
                        setCurrentWorkspace(ws);
                        setWsDropdownOpen(false);
                      }}
                    >
                      {ws.name}
                    </button>
                  ))}
                  {workspaces.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No workspaces yet
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: user menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-foreground">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <Link href="/settings">
                    <div
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </div>
                  </Link>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-secondary"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        {/* Subtle gradient accent line under top bar */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
