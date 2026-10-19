import { CheckCircle, CircleNotch, WarningCircle, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";

const MAP = {
  saved: { text: "Tersimpan", cls: "text-muted", Icon: CheckCircle },
  dirty: { text: "Belum tersimpan", cls: "text-muted", Icon: PencilSimpleLine },
  saving: { text: "Menyimpan...", cls: "text-muted", Icon: CircleNotch, spin: true },
  error: { text: "Gagal menyimpan, mencoba lagi", cls: "text-danger", Icon: WarningCircle },
};

export default function SaveStatus({ status, error }) {
  const { text, cls, Icon, spin } = MAP[status] || MAP.saved;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${cls}`} role="status" title={error || undefined}>
      <Icon size={16} className={spin ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}
