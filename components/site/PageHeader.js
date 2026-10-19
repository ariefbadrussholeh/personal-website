export default function PageHeader({ title, children }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-5 pb-10 pt-14 md:px-8 md:pt-20">
      <h1 className="text-4xl font-semibold tracking-tighter md:text-5xl">{title}</h1>
      {children && <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">{children}</p>}
    </header>
  );
}
