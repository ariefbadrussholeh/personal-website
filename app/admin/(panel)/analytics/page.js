import Link from "next/link";
import { getAnalytics } from "@/lib/db";
import DailyBars from "@/components/admin/DailyBars";
import RankList from "@/components/admin/RankList";

export const metadata = { title: "Analitik" };

const RANGES = [
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
  { days: 90, label: "90 hari" },
];

const nf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Stat({ label, value, note }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-faint">{note}</p>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-[10px] border border-line bg-surface p-5 md:p-6">
      <h2 className="mb-5 font-medium tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }) {
  const { range } = await searchParams;
  const days = RANGES.some((r) => String(r.days) === range) ? Number(range) : 7;
  const a = await getAnalytics(days);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter">Analitik</h1>
      <p className="mt-2 text-muted">Kunjungan ke situs, tanpa cookie pelacak dan tanpa layanan pihak ketiga.</p>

      {/* One filter row above everything it scopes */}
      <div className="mb-8 mt-8 flex flex-wrap gap-2" role="group" aria-label="Rentang waktu">
        {RANGES.map((r) => (
          <Link
            key={r.days}
            href={`/admin/analytics?range=${r.days}`}
            aria-current={days === r.days ? "true" : undefined}
            className={`btn btn-sm ${days === r.days ? "!border-accent/60 !text-accent" : "text-muted"}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tampilan halaman" value={nf.format(a.views)} note={`${a.days} hari terakhir`} />
        <Stat label="Pengunjung" value={nf.format(a.visitors)} note="unik per hari" />
        <Stat label="Like" value={nf.format(a.likes)} note="situs dan tulisan" />
        <Stat label="Komentar dan pesan" value={`${a.comments} / ${a.messages}`} note="seluruh waktu" />
      </div>

      <div className="mt-6 space-y-6">
        <Panel title="Tampilan halaman per hari">
          {a.views === 0 ? (
            <p className="rounded-[10px] border border-dashed border-line-strong px-5 py-10 text-center text-muted">
              Belum ada kunjungan tercatat pada rentang ini. Kunjunganmu sendiri sebagai admin tidak dihitung.
            </p>
          ) : (
            <DailyBars series={a.series} />
          )}
          {a.truncated && (
            <p className="mt-3 text-xs text-faint">Data sangat banyak, hanya 30.000 kunjungan terbaru yang dihitung.</p>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Halaman terpopuler">
            <RankList rows={a.pages} />
          </Panel>
          <Panel title="Asal kunjungan">
            <RankList rows={a.referrers} />
          </Panel>
          <Panel title="Perangkat">
            <RankList rows={a.devices} />
          </Panel>
          <Panel title="Browser">
            <RankList rows={a.browsers} />
          </Panel>
        </div>

        {a.countries.length > 0 && (
          <Panel title="Negara">
            <RankList rows={a.countries} />
          </Panel>
        )}
      </div>
    </>
  );
}
