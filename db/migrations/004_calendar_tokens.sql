-- Link đồng bộ lịch học vào Google Calendar. Chạy sau 002_class_schedules.sql.
-- Mỗi người dùng có một mã bí mật; Google Calendar đọc lịch qua /api/calendar/<mã>.ics (không cần đăng nhập).

create table if not exists calendar_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz default now()
);

-- Chỉ server (service role) đọc/ghi bảng này nên không mở policy nào cho client.
alter table calendar_tokens enable row level security;
