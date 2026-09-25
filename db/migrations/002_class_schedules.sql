-- Lịch học. Chạy file này trên database đã tồn tại (SQL Editor của Supabase).
-- class_schedules: lịch cố định hằng tuần (giờ theo giờ Việt Nam).
-- class_sessions: buổi học thêm, hoặc buổi của lịch cố định bị sửa (huỷ / dời giờ / ghi chú).

create table if not exists class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7), -- 1 = Thứ 2 ... 7 = Chủ nhật
  start_time time not null,
  end_time time not null,
  mode text not null default 'online' check (mode in ('online', 'offline')),
  meeting_url text,
  location text,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz default now(),
  check (end_time > start_time)
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  schedule_id uuid references class_schedules(id) on delete cascade,
  original_date date, -- ngày gốc theo lịch cố định (null với buổi học thêm)
  session_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  title text,
  note text,
  mode text not null default 'online' check (mode in ('online', 'offline')),
  meeting_url text,
  location text,
  created_at timestamptz default now(),
  check (end_time > start_time),
  unique (schedule_id, original_date)
);

create index if not exists class_schedules_class_id_idx on class_schedules(class_id);
create index if not exists class_sessions_class_date_idx on class_sessions(class_id, session_date);

alter table class_schedules enable row level security;
alter table class_sessions enable row level security;

create policy "teachers manage class schedules" on class_schedules for all using (
  exists (select 1 from classes c where c.id = class_schedules.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classes c where c.id = class_schedules.class_id and c.teacher_id = auth.uid())
);
create policy "students view class schedules" on class_schedules for select using (
  exists (select 1 from class_students cs where cs.class_id = class_schedules.class_id and cs.student_id = auth.uid())
);

create policy "teachers manage class sessions" on class_sessions for all using (
  exists (select 1 from classes c where c.id = class_sessions.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classes c where c.id = class_sessions.class_id and c.teacher_id = auth.uid())
);
create policy "students view class sessions" on class_sessions for select using (
  exists (select 1 from class_students cs where cs.class_id = class_sessions.class_id and cs.student_id = auth.uid())
);

-- Ngày nghỉ (lễ, trung tâm nghỉ) của giáo viên: buổi theo lịch cố định rơi vào ngày này sẽ tự nghỉ.
create table if not exists teacher_holidays (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  created_at timestamptz default now(),
  unique (teacher_id, holiday_date)
);

alter table teacher_holidays enable row level security;

create policy "teachers manage own holidays" on teacher_holidays for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students view holidays of their teachers" on teacher_holidays for select using (
  exists (
    select 1 from classes c
    join class_students cs on cs.class_id = c.id
    where c.teacher_id = teacher_holidays.teacher_id and cs.student_id = auth.uid()
  )
);
