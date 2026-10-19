import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center px-6">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tighter">This page does not exist.</h1>
      <p className="mt-4 text-muted">It may have moved, or it is still a draft.</p>
      <Link href="/" className="btn btn-primary mt-8">Back to home</Link>
    </main>
  );
}
