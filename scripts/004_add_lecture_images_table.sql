-- Create lecture images table for image storage (max 5 per lecture)
create table if not exists public.lecture_images (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null, -- Vercel Blob storage path
  file_size integer, -- Size in bytes
  uploaded_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.lecture_images enable row level security;

-- RLS Policies
create policy "lecture_images_select_own"
  on public.lecture_images for select
  using (auth.uid() = user_id);

create policy "lecture_images_insert_own"
  on public.lecture_images for insert
  with check (auth.uid() = user_id);

create policy "lecture_images_delete_own"
  on public.lecture_images for delete
  using (auth.uid() = user_id);
