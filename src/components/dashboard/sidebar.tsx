/**
 * Dashboard sidebar — main navigation for `/dashboard`.
 *
 * Collapsible on tablet/mobile (uses `collapsible="icon"` from shadcn/ui
 * sidebar-07 pattern) so it folds into a rail of icons when the
 * viewport shrinks.
 *
 * Renders the user dropdown at the bottom and a primary nav for the
 * modules the operator (ADMIN / SECRETARY / PROFESSIONAL) can reach.
 *
 * UI copy is in Argentinian Spanish. Code comments in English.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings2,
  Stethoscope,
  Users,
  Wrench,
} from "lucide-react";

import { USER_ROLE, type UserRoleType } from "@/modules/auth/domain/roles";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/modules/auth/hooks";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly UserRoleType[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
      {
        title: "Calendario",
        url: "/dashboard/calendar",
        icon: CalendarRange,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
    ],
  },
  {
    label: "Operación",
    items: [
      {
        title: "Reservas",
        url: "/dashboard/bookings",
        icon: CalendarDays,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
      {
        title: "Pacientes",
        url: "/dashboard/patients",
        icon: Users,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
      {
        title: "Profesionales",
        url: "/dashboard/professionals",
        icon: Stethoscope,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY],
      },
      {
        title: "Servicios",
        url: "/dashboard/services",
        icon: Wrench,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
      {
        title: "Pagos",
        url: "/dashboard/payments",
        icon: CreditCard,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        title: "Configuración",
        url: "/dashboard/settings",
        icon: Settings2,
        roles: [USER_ROLE.ADMIN],
      },
      {
        title: "Soporte",
        url: "/dashboard/support",
        icon: LifeBuoy,
        roles: [USER_ROLE.ADMIN, USER_ROLE.SECRETARY, USER_ROLE.PROFESSIONAL],
      },
    ],
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface DashboardSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  variant?: "inset" | "sidebar" | "floating";
}

export function DashboardSidebar({ user, variant = "inset" }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const role = user.role as UserRoleType;

  return (
    <Sidebar variant={variant} collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CalendarRange className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Booking Engine</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Panel de gestión
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) =>
            item.roles.includes(role),
          );
          if (visible.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const isActive =
                      pathname === item.url ||
                      (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`));
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link href={item.url}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()}>
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
