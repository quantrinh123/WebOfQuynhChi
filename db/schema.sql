create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(class_id, student_id)
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id),
  title text not null,
  grade text default '12',
  duration_minutes int not null default 90,
  total_score numeric(5,2) not null default 10,
  question_pdf_path text,
  answer_pdf_path text,
  exam_format text not null default 'math_thpt_2025',
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  show_score_after_submit boolean not null default true,
  show_answer_after_submit boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  section_type text not null check (section_type in ('single_choice', 'true_false', 'short_answer')),
  title text not null,
  order_no int not null
);

create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  section_id uuid not null references exam_sections(id) on delete cascade,
  parent_question_id uuid references exam_questions(id) on delete cascade,
  question_no int not null,
  sub_label text,
  question_type text not null check (question_type in ('single_choice', 'true_false_group', 'true_false_item', 'short_answer')),
  correct_answer text,
  correct_answers_json jsonb,
  score numeric(5,2) not null default 0,
  scoring_rule text,
  topic text,
  order_no int not null,
  created_at timestamptz default now()
);

create table if not exists exam_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz default now(),
  unique(exam_id, class_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  auto_score numeric(5,2) default 0,
  final_score numeric(5,2) default 0,
  status text not null default 'doing' check (status in ('doing', 'submitted', 'graded')),
  created_at timestamptz default now(),
  unique(exam_id, student_id)
);

create table if not exists submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  question_id uuid not null references exam_questions(id) on delete cascade,
  selected_option text,
  boolean_answer boolean,
  answer_text text,
  is_correct boolean,
  score numeric(5,2) default 0,
  created_at timestamptz default now(),
  unique(submission_id, question_id)
);

create index if not exists exams_teacher_id_idx on exams(teacher_id);
create index if not exists classes_teacher_id_idx on classes(teacher_id);
create index if not exists class_students_class_id_idx on class_students(class_id);
create index if not exists class_students_student_id_idx on class_students(student_id);
create index if not exists submissions_exam_id_idx on submissions(exam_id);
create index if not exists submissions_student_id_idx on submissions(student_id);
create index if not exists submission_answers_submission_id_idx on submission_answers(submission_id);

alter table profiles enable row level security;
alter table classes enable row level security;
alter table class_students enable row level security;
alter table exams enable row level security;
alter table exam_sections enable row level security;
alter table exam_questions enable row level security;
alter table exam_assignments enable row level security;
alter table submissions enable row level security;
alter table submission_answers enable row level security;

create policy "profiles own select" on profiles for select using (auth.uid() = id);
create policy "profiles teacher sees class students" on profiles for select using (
  exists (
    select 1 from classes c
    join class_students cs on cs.class_id = c.id
    where c.teacher_id = auth.uid() and cs.student_id = profiles.id
  )
);

create policy "teachers manage own classes" on classes for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students view joined classes" on classes for select using (
  exists (select 1 from class_students cs where cs.class_id = classes.id and cs.student_id = auth.uid())
);

create policy "teachers manage class students" on class_students for all using (
  exists (select 1 from classes c where c.id = class_students.class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from classes c where c.id = class_students.class_id and c.teacher_id = auth.uid())
);
create policy "students view own memberships" on class_students for select using (student_id = auth.uid());

create policy "teachers manage own exams" on exams for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "students view assigned exams" on exams for select using (
  exists (
    select 1 from exam_assignments ea
    join class_students cs on cs.class_id = ea.class_id
    where ea.exam_id = exams.id and cs.student_id = auth.uid()
  )
);

create policy "exam sections assigned or owner" on exam_sections for select using (
  exists (select 1 from exams e where e.id = exam_sections.exam_id and e.teacher_id = auth.uid())
  or exists (
    select 1 from exam_assignments ea
    join class_students cs on cs.class_id = ea.class_id
    where ea.exam_id = exam_sections.exam_id and cs.student_id = auth.uid()
  )
);

create policy "exam questions assigned or owner" on exam_questions for select using (
  exists (select 1 from exams e where e.id = exam_questions.exam_id and e.teacher_id = auth.uid())
  or exists (
    select 1 from exam_assignments ea
    join class_students cs on cs.class_id = ea.class_id
    where ea.exam_id = exam_questions.exam_id and cs.student_id = auth.uid()
  )
);
create policy "teachers update own questions" on exam_questions for all using (
  exists (select 1 from exams e where e.id = exam_questions.exam_id and e.teacher_id = auth.uid())
) with check (
  exists (select 1 from exams e where e.id = exam_questions.exam_id and e.teacher_id = auth.uid())
);

create policy "teachers manage assignments" on exam_assignments for all using (
  exists (select 1 from exams e where e.id = exam_assignments.exam_id and e.teacher_id = auth.uid())
) with check (
  exists (select 1 from exams e where e.id = exam_assignments.exam_id and e.teacher_id = auth.uid())
);
create policy "students view assignments" on exam_assignments for select using (
  exists (select 1 from class_students cs where cs.class_id = exam_assignments.class_id and cs.student_id = auth.uid())
);

create policy "students manage own submissions" on submissions for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teachers view exam submissions" on submissions for select using (
  exists (select 1 from exams e where e.id = submissions.exam_id and e.teacher_id = auth.uid())
);

create policy "students manage own answers" on submission_answers for all using (
  exists (select 1 from submissions s where s.id = submission_answers.submission_id and s.student_id = auth.uid())
) with check (
  exists (select 1 from submissions s where s.id = submission_answers.submission_id and s.student_id = auth.uid())
);
create policy "teachers view answers" on submission_answers for select using (
  exists (
    select 1 from submissions s
    join exams e on e.id = s.exam_id
    where s.id = submission_answers.submission_id and e.teacher_id = auth.uid()
  )
);

-- Storage: create private bucket exam-pdfs in Supabase dashboard.
-- This app uses service role uploads and signed URLs for reading PDFs.
