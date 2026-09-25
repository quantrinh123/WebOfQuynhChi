-- Chạy file này trên database đã tồn tại (SQL Editor của Supabase).
create table if not exists class_recordings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  title text not null,
  url text not null,
  recorded_at date,
  created_at timestamptz default now()
);

create index if not exists class_recordings_class_id_idx on class_recordings(class_id);

alter table class_recordings enable row level security;

create policy "teachers manage class recordings" on class_recordings for all using (
  exists (select 1 from classes c where c.id = class_recordings.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classes c where c.id = class_recordings.class_id and c.teacher_id = auth.uid())
);
create policy "students view class recordings" on class_recordings for select using (
  exists (select 1 from class_students cs where cs.class_id = class_recordings.class_id and cs.student_id = auth.uid())
);
