import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const unread = await countUnreadMessages().catch(() => 0);
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <aside className="lg:sticky lg:top-10 lg:self-start">
        <p className="mb-4 hidden px-3 text-sm font-semibold tracking-tight lg:block">Panel admin</p>
        <AdminNav unread={unread} />
      </aside>
      <div className="min-w-0 pb-16">{children}</div>
    </div>
  );
}
