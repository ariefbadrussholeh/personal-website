import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Masuk", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tighter">Masuk ke admin</h1>
      <p className="mt-2 text-muted">Hanya untuk pemilik situs.</p>
      <LoginForm />
    </main>
  );
}
