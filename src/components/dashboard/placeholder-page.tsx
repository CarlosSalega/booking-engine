/**
 * Placeholder page for routes that are linked in the sidebar but not yet
 * implemented. Shows the module name, icon, and a "Próximamente" message
 * so the sidebar link doesn't 404.
 *
 * UI copy in Argentinian Spanish.
 */

import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Icon className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Próximamente</p>
        </CardContent>
      </Card>
    </div>
  );
}
