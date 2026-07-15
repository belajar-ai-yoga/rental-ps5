import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <AdminShell>
      <SettingsForm
        initial={{
          shopName: settings.shopName,
          whatsappNumber: settings.whatsappNumber,
          openHour: settings.openHour,
          closeHour: settings.closeHour,
          bookingWindowDays: settings.bookingWindowDays,
          pricePerHour: settings.pricePerHour,
        }}
      />
    </AdminShell>
  );
}
