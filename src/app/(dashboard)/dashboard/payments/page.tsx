import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

export default function PaymentsPage() {
  return (
    <PlaceholderPage
      title="Pagos"
      description="Registro y seguimiento de pagos de turnos."
      icon={CreditCard}
    />
  );
}
