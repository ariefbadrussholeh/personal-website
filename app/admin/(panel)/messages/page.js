import { listEntries } from "@/lib/db";
import MessageList from "@/components/admin/MessageList";

export const metadata = { title: "Pesan" };

export default async function Page() {
  const items = await listEntries("messages");
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter">Pesan</h1>
      <p className="mb-8 mt-2 text-muted">Pesan dari halaman kontak.</p>
      <MessageList initial={items} />
    </>
  );
}
