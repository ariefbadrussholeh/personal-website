import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

export const metadata = { title: "Editor", robots: { index: false, follow: false } };

// Editors run full width, without the sidebar, so writing stays focused.
export default async function EditorLayout({ children }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return children;
}
