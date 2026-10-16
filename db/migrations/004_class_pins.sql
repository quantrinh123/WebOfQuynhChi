-- Ghim lớp học: lớp được ghim hiển thị lên đầu danh sách. Chạy sau 003_attendance.sql.

alter table classes add column if not exists pinned_at timestamptz;
