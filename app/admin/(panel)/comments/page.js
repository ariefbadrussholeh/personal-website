import { listCommentsForAdmin } from "@/lib/db";
import CommentList from "@/components/admin/CommentList";

export const metadata = { title: "Komentar" };

export default async function Page() {
  const items = await listCommentsForAdmin();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter">Komentar</h1>
      <p className="mb-8 mt-2 text-muted">Komentar tampil langsung. Sembunyikan atau hapus yang tidak pantas.</p>
      <CommentList initial={items} />
    </>
  );
}
