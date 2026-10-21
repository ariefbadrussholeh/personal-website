-- Jalankan sekali di Supabase: Dashboard > SQL Editor > New query > paste > Run.
-- Aman dijalankan ulang (memakai IF NOT EXISTS).

create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  slug_auto     boolean not null default true,
  title         text not null default '',
  excerpt       text not null default '',
  content       text not null default '',
  cover         text not null default '',
  tags          text[] not null default '{}',
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.projects (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  slug_auto     boolean not null default true,
  title         text not null default '',
  summary       text not null default '',
  content       text not null default '',
  cover         text not null default '',
  tech          text[] not null default '{}',
  live_url      text not null default '',
  repo_url      text not null default '',
  year          text not null default '',
  role          text not null default '',
  featured      boolean not null default false,
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.albums (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  slug_auto     boolean not null default true,
  title         text not null default '',
  description   text not null default '',
  cover         text not null default '',
  date          text not null default '',   -- format YYYY-MM-DD
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Migrasi aman jika tabel albums sudah ada sebelumnya:
alter table public.albums add column if not exists date text not null default '';

create table if not exists public.photos (
  id            bigint generated always as identity primary key,
  album_id      bigint not null references public.albums(id) on delete cascade,
  url           text not null,
  caption       text not null default '',
  width         integer not null default 0,
  height        integer not null default 0,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists photos_album_idx on public.photos (album_id, position);

create table if not exists public.settings (
  key           text primary key,
  value         text not null
);

create table if not exists public.experiences (
  id            bigint generated always as identity primary key,
  company       text not null default '',
  role          text not null default '',
  location      text not null default '',
  url           text not null default '',
  icon          text not null default '',
  start_date    text not null default '',   -- format YYYY-MM
  end_date      text not null default '',   -- kosong = belum selesai
  is_current    boolean not null default false,
  highlights    text[] not null default '{}',
  tech          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Migrasi aman jika tabel sudah ada sebelumnya:
alter table public.experiences add column if not exists icon text not null default '';

create table if not exists public.messages (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null,
  subject       text not null default '',
  message       text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);

create table if not exists public.comments (
  id            bigint generated always as identity primary key,
  post_id       bigint not null references public.posts(id) on delete cascade,
  name          text not null,
  body          text not null,
  approved      boolean not null default true,
  visitor       text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- target: 'site' atau 'post:<id>'. Satu pengunjung hanya bisa like satu kali per target.
create table if not exists public.likes (
  id            bigint generated always as identity primary key,
  target        text not null,
  visitor       text not null,
  created_at    timestamptz not null default now(),
  unique (target, visitor)
);
create index if not exists likes_target_idx on public.likes (target);

-- Analitik tanpa cookie pelacak: pengunjung = hash harian dari IP + browser.
create table if not exists public.page_views (
  id            bigint generated always as identity primary key,
  path          text not null,
  referrer      text not null default '',
  device        text not null default '',
  browser       text not null default '',
  country       text not null default '',
  visitor       text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists page_views_created_idx on public.page_views (created_at desc);

create index if not exists posts_published_idx    on public.posts    (published, published_at desc);
create index if not exists projects_published_idx on public.projects (published, published_at desc);
create index if not exists albums_published_idx   on public.albums   (published, published_at desc);

-- Keamanan: semua tabel dikunci. Hanya server Next.js yang boleh membaca dan
-- menulis, memakai service role key (yang melewati RLS). Kunci "anon" yang
-- terlihat di browser tidak punya akses sama sekali karena tidak ada policy.
alter table public.posts    enable row level security;
alter table public.projects enable row level security;
alter table public.albums   enable row level security;
alter table public.photos   enable row level security;
alter table public.settings enable row level security;
alter table public.experiences enable row level security;
alter table public.messages enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.page_views enable row level security;

-- Bucket penyimpanan gambar dan video pendek. Publik untuk dibaca,
-- tetapi hanya server yang bisa mengunggah dan menghapus.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
