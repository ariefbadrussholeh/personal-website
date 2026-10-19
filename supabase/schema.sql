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
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

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

-- Bucket penyimpanan gambar. Publik untuk dibaca (supaya <img> bisa menampilkan),
-- tetapi hanya server yang bisa mengunggah dan menghapus.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
