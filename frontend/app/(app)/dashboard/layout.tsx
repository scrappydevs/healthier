"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Search,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useChatStore } from "@/stores/chatStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import { logoutAction } from "./actions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Hospital View", href: "/dashboard/hospital", icon: Building2 },
  { name: "Patients", href: "/dashboard/patients", icon: Users },
];

const bottomNavigation = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavItem({ 
  item, 
  isActive,
  collapsed,
}: { 
  item: { name: string; href: string; icon: React.ElementType }; 
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium tracking-tight transition-colors w-full relative",
        collapsed && "justify-center px-2",
        isActive
          ? "bg-primary/8 text-slate-900"
          : "text-slate-500 hover:bg-muted/50 hover:text-slate-900"
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-slate-900" : "text-slate-400")} />
      {!collapsed && <span>{item.name}</span>}
      {isActive && !collapsed && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-900" />
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [chatWidth, setChatWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  
  const { 
    isChatOpen, 
    closeChat, 
    toggleChat,
  } = useChatStore();

  const {
    isOpen: sidebarOpen,
    toggle: toggleSidebar,
  } = useSidebarStore();

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const sidebarWidth = sidebarOpen ? 224 : 56;
      const newWidth = window.innerWidth - e.clientX - sidebarWidth;
      setChatWidth(Math.max(320, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, sidebarOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "b") {
        e.preventDefault();
        toggleChat();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleChat, toggleSidebar]);

  // Handle cache invalidation from AI chat
  const handleCacheInvalidate = useCallback((keys: string[]) => {
    console.log('🔄 Cache invalidated:', keys);
    // Dispatch custom event for components to refresh their data
    window.dispatchEvent(new CustomEvent('pillpal-invalidate-cache', {
      detail: { keys, timestamp: Date.now() }
    }));
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - white background */}
      <aside 
        className={cn(
          "flex h-screen flex-col bg-white border-r shrink-0 transition-all duration-200 ease-in-out",
          sidebarOpen ? "w-56" : "w-14"
        )}
      >
        {/* Header - Logo centered */}
        <div className={cn(
          "flex items-center justify-center h-12 border-b shrink-0",
          sidebarOpen ? "px-4" : "px-2"
        )}>
          {sidebarOpen ? (
            <Link href="/" className="text-xl font-semibold text-slate-900 tracking-tight">
              healthier
            </Link>
          ) : (
            <Link href="/" className="h-7 w-7 flex items-center justify-center text-lg font-semibold text-slate-900">
              H
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-1 flex-col", sidebarOpen ? "px-3 pt-4 pb-2" : "px-2 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <NavItem 
                  key={item.name} 
                  item={item} 
                  isActive={isActive} 
                  collapsed={!sidebarOpen}
                />
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-0.5">
            {bottomNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <NavItem 
                  key={item.name} 
                  item={item} 
                  isActive={isActive}
                  collapsed={!sidebarOpen}
                />
              );
            })}
            <button 
              onClick={() => logoutAction()}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium tracking-tight text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 w-full",
                !sidebarOpen && "justify-center px-2"
              )}
              title={!sidebarOpen ? "Sign out" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {sidebarOpen && <span>Sign out</span>}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content - slight tint */}
      <div className="flex-1 flex min-w-0">
        <div 
          className={cn(
            "flex-1 flex flex-col h-full min-w-0",
            "transition-all duration-200 ease-in-out"
          )}
          style={{ marginRight: isChatOpen ? chatWidth : 0 }}
        >
          {/* Header */}
          <header className="flex h-12 items-center justify-between bg-white px-4 shrink-0 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={toggleSidebar}
                title={sidebarOpen ? "Collapse sidebar (⌘B)" : "Expand sidebar (⌘B)"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <h1 className="text-sm font-semibold text-slate-900 tracking-tight">
                {navigation.find(n => pathname === n.href || 
                  (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.name || "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative mr-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-8 w-40 rounded-md border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8",
                  isChatOpen && "bg-primary/8 text-primary"
                )}
                onClick={toggleChat}
                title="Toggle AI Assistant (⌘⇧B)"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <NotificationDropdown />
            </div>
          </header>

          {/* Page Content - muted background */}
          <main className="flex-1 overflow-auto bg-muted/40">
            <div className="p-4">
              {children}
            </div>
          </main>
        </div>

        {/* Chat Panel - white background */}
        <div 
          className={cn(
            "fixed top-0 right-0 h-full bg-white border-l",
            "transition-transform duration-200 ease-in-out",
            isChatOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ width: chatWidth }}
        >
          {/* Resize Handle */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize",
              "hover:bg-primary/20 active:bg-primary/30",
              "transition-colors"
            )}
            onMouseDown={handleMouseDown}
          />
          
          <ChatSidebar 
            isCollapsed={!isChatOpen} 
            onClose={closeChat} 
            onCacheInvalidate={handleCacheInvalidate}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes messageAppear {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-message-appear {
          animation: messageAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
