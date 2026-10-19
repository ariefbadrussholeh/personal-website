import { getSettings } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter">Pengaturan</h1>
      <p className="mb-8 mt-2 text-muted">Profil, tautan sosial, dan halaman About.</p>
      <SettingsForm initial={await getSettings()} />
    </>
  );
}
