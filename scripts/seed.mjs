// Fills an empty database with sample content so the site is not blank.
// Usage: npm run seed      (reads .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local dulu.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function check(label, q) {
  const { data, error } = await q;
  if (error) {
    console.error(`Gagal (${label}): ${error.message}`);
    if (/relation .* does not exist|schema cache/i.test(error.message)) {
      console.error("Tabel belum ada. Jalankan supabase/schema.sql di SQL Editor Supabase terlebih dulu.");
    }
    process.exit(1);
  }
  return data;
}

const force = process.argv.includes("--force");
const hasContent = (await check("cek data", sb.from("posts").select("id").limit(1))).length > 0;
const hasExperience = (await check("cek pengalaman", sb.from("experiences").select("id").limit(1))).length > 0;
const skipContent = hasContent && !force;
const skipExperience = hasExperience && !force;
if (skipContent && skipExperience) {
  console.log("Database sudah berisi data, seed dilewati. Pakai --force untuk menambah contoh lagi.");
  process.exit(0);
}

const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const posts = [
  {
    slug: "writing-fast-react-lists",
    title: "Writing React lists that stay fast",
    excerpt: "Three habits that keep long lists smooth: stable keys, cheap rows, and rendering only what is visible.",
    cover: "/samples/post-1.jpg",
    tags: ["react", "performance"],
    published_at: day(6),
    content: `Long lists are where a small inefficiency turns into a visible stutter. Here is what I check first.

## Use stable keys

A key tells React which row is which. An array index works until the list is reordered, then state jumps to the wrong row.

\`\`\`jsx
{items.map((item) => (
  <Row key={item.id} item={item} />
))}
\`\`\`

## Keep rows cheap

- Move formatting out of render when the input has not changed.
- Memoize rows that receive the same props most of the time.
- Avoid creating new objects or functions inside the loop.

## Render only what is visible

Past a few hundred rows, virtualization wins. Libraries such as TanStack Virtual keep the DOM small while the list feels endless.

> Measure before optimizing. The React profiler shows which row actually re-renders.
`,
  },
  {
    slug: "my-postgres-notes",
    title: "Postgres notes I keep coming back to",
    excerpt: "A short reference for indexes, EXPLAIN, and the habits that prevent slow queries in small apps.",
    cover: "/samples/post-2.jpg",
    tags: ["postgres", "database"],
    published_at: day(20),
    content: `A few notes from running small Postgres databases in production.

## Read the plan

\`\`\`sql
EXPLAIN ANALYZE
SELECT * FROM posts WHERE published = true ORDER BY published_at DESC LIMIT 10;
\`\`\`

If the plan shows a sequential scan on a large table, an index is usually the answer.

## Index what you filter and sort by

1. Columns in \`WHERE\`
2. Columns in \`ORDER BY\`
3. Foreign keys

Row Level Security stays on for every table, even when the server uses a service key.
`,
  },
  {
    slug: "draft-ideas",
    title: "Ideas for the next post",
    excerpt: "A draft that stays private until published.",
    cover: "",
    tags: ["notes"],
    published: false,
    content: "Only visible to the admin.",
  },
];

const projects = [
  {
    slug: "queueline",
    title: "Queueline",
    summary: "A booking and queue system for small clinics, with live waiting-time estimates.",
    cover: "/samples/project-1.jpg",
    tech: ["Next.js", "Supabase", "Tailwind"],
    year: "2026",
    role: "Full-stack developer",
    featured: true,
    live_url: "https://example.com",
    repo_url: "https://github.com",
    published_at: day(10),
    content: `## Overview

Queueline replaces paper queue numbers in small clinics. Patients book from their phone and see an estimated waiting time that updates as the day goes on.

## What I built

- Booking flow with slot locking
- Realtime queue board using Supabase Realtime
- Admin dashboard for front-desk staff
`,
  },
  {
    slug: "logbook-cli",
    title: "Logbook CLI",
    summary: "A command line tool that turns git history into a weekly work log.",
    cover: "/samples/project-2.jpg",
    tech: ["Node.js", "Git"],
    year: "2025",
    role: "Author",
    featured: true,
    repo_url: "https://github.com",
    published_at: day(40),
    content: "## Overview\n\nRun `logbook week` and get a readable summary of what you shipped.\n",
  },
  {
    slug: "pantry-api",
    title: "Pantry API",
    summary: "A small REST API for tracking groceries and expiry dates, built as a learning project.",
    cover: "/samples/project-3.jpg",
    tech: ["Express", "PostgreSQL", "Docker"],
    year: "2025",
    role: "Solo developer",
    featured: true,
    published_at: day(70),
    content: "## Overview\n\nA compact API with auth, pagination and a Docker setup.\n",
  },
  {
    slug: "typebench",
    title: "Typebench",
    summary: "A typing practice site that measures speed per key and shows where you slow down.",
    cover: "/samples/project-4.jpg",
    tech: ["React", "Vite"],
    year: "2024",
    role: "Solo developer",
    featured: false,
    published_at: day(120),
    content: "## Overview\n\nPer-key statistics and a calm, distraction-free interface.\n",
  },
];

const photos = [
  ["/samples/photo-1.jpg", 1200, 1500, "Morning light"],
  ["/samples/photo-2.jpg", 1500, 1000, "Long road"],
  ["/samples/photo-3.jpg", 1200, 1200, ""],
  ["/samples/photo-4.jpg", 1200, 1600, "Late night desk"],
  ["/samples/photo-5.jpg", 1600, 1067, ""],
  ["/samples/photo-6.jpg", 1200, 1500, "Quiet street"],
];

if (!skipContent) {
  for (const p of posts) {
    await check(`post ${p.slug}`, sb.from("posts").insert({ published: true, slug_auto: false, ...p }));
  }
  for (const p of projects) {
    await check(`project ${p.slug}`, sb.from("projects").insert({ published: true, slug_auto: false, ...p }));
  }
  const [album] = await check(
    "album",
    sb
      .from("albums")
      .insert({
        slug: "weekend-walks",
        slug_auto: false,
        title: "Weekend walks",
        description: "Photos from walks outside the city, taken on whatever camera I had with me.",
        published: true,
        published_at: day(15),
        date: "2024-10-12",
      })
      .select("id")
  );
  await check(
    "photos",
    sb.from("photos").insert(
      photos.map(([u, width, height, caption], i) => ({ album_id: album.id, url: u, width, height, caption, position: i }))
    )
  );
}

const experiences = [
  {
    company: "Lintasdata",
    role: "Senior Software Engineer",
    location: "Jakarta, hybrid",
    url: "https://example.com",
    icon: "nextdotjs",
    start_date: "2024-02",
    end_date: "",
    is_current: true,
    highlights: [
      "Memimpin migrasi dashboard analitik dari server-rendered ke Next.js, waktu muat halaman utama turun dari 4 detik ke 1,3 detik.",
      "Merancang pipeline impor data CSV berukuran besar dengan antrean dan retry, sehingga tim operasional tidak lagi mengunggah ulang secara manual.",
      "Mentoring tiga engineer junior lewat code review dan sesi pairing mingguan.",
    ],
    tech: ["Next.js", "PostgreSQL", "TypeScript", "Docker"],
  },
  {
    company: "Kopikode Studio",
    role: "Full-stack Developer",
    location: "Bandung",
    url: "",
    icon: "react",
    start_date: "2021-06",
    end_date: "2024-01",
    is_current: false,
    highlights: [
      "Membangun sistem pemesanan untuk jaringan kafe dengan 14 outlet, dari aplikasi kasir sampai laporan harian.",
      "Mengurangi biaya infrastruktur sekitar sepertiga dengan memindahkan layanan lama ke satu kluster terkelola.",
    ],
    tech: ["React", "Node.js", "MySQL"],
  },
  {
    company: "Rawa Digital",
    role: "Junior Web Developer",
    location: "Yogyakarta",
    url: "",
    icon: "",
    start_date: "2019-08",
    end_date: "2021-05",
    is_current: false,
    highlights: [
      "Mengerjakan situs company profile dan toko online untuk klien UMKM, dari desain sampai deploy.",
      "Menulis komponen UI yang dipakai ulang di lebih dari sepuluh proyek.",
    ],
    tech: ["JavaScript", "Laravel", "Tailwind"],
  },
];

if (!skipExperience) {
  for (const e of experiences) await check(`pengalaman ${e.company}`, sb.from("experiences").insert(e));
}

console.log("Selesai: data contoh ditambahkan" + (skipContent ? "" : " (3 tulisan, 4 project, 1 album)") + (skipExperience ? "" : ", 3 pengalaman kerja") + ".");
