-- Supabase Auth users should be created in Authentication first.
-- Then replace the UUIDs below with the created user IDs and run this file.

insert into profiles (id, full_name, role) values
  ('00000000-0000-0000-0000-000000000001', 'Giáo viên demo', 'teacher'),
  ('00000000-0000-0000-0000-000000000002', 'Học sinh demo 1', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'Học sinh demo 2', 'student')
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;

insert into classes (id, teacher_id, name, description) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '12A1', 'Lớp ôn thi demo')
on conflict (id) do nothing;

insert into class_students (class_id, student_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003')
on conflict (class_id, student_id) do nothing;

-- Tạo đề demo nhanh hơn bằng UI vì action sẽ tự sinh 22 câu theo đúng format.
