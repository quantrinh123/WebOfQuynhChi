-- Điểm danh theo từng buổi học (Có mặt / Vắng). Chạy sau 002_class_schedules.sql.
-- Buổi theo lịch cố định sẽ được lưu thành một dòng class_sessions khi giáo viên điểm danh lần đầu.

create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null check (status in ('present', 'absent')),
  updated_at timestamptz default now(),
  unique (session_id, student_id)
);

create index if not exists session_attendance_student_idx on session_attendance(student_id);

alter table session_attendance enable row level security;

create policy "teachers manage attendance" on session_attendance for all using (
  exists (
    select 1 from class_sessions s
    join classes c on c.id = s.class_id
    where s.id = session_attendance.session_id and c.teacher_id = auth.uid()
  )
) with check (
  exists (
    select 1 from class_sessions s
    join classes c on c.id = s.class_id
    where s.id = session_attendance.session_id and c.teacher_id = auth.uid()
  )
);
create policy "students view own attendance" on session_attendance for select using (student_id = auth.uid());
