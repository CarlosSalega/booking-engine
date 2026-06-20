/**
 * Recent activity feed — a list of the latest bookings, payments and
 * new patients merged and sorted by timestamp (newest first).
 *
 * Server Component. Renders an empty state when there's no activity.
 */

import {
  CalendarPlus,
  CircleDollarSign,
  History,
  UserPlus,
} from "lucide-react";

import {
  getRecentActivity,
  formatRelativeTime,
} from "@/modules/dashboard";
import type { ActivityType } from "@/modules/dashboard";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RecentActivityProps {
  organizationId: string;
}

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  booking: CalendarPlus,
  payment: CircleDollarSign,
  patient: UserPlus,
};

const TONE: Record<ActivityType, string> = {
  booking: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  payment: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  patient: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const LABEL: Record<ActivityType, string> = {
  booking: "Reserva",
  payment: "Pago",
  patient: "Paciente",
};

export async function RecentActivity({ organizationId }: RecentActivityProps) {
  const items = await getRecentActivity(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
        <CardDescription>
          Últimos movimientos del consultorio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sin actividad registrada todavía.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const Icon = ICONS[item.type];
              return (
                <li key={`${item.type}-${item.id}`} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${TONE[item.type]}`}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-medium">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {LABEL[item.type]} · {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
