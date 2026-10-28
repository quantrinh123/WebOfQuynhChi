-- Câu tự luận (giáo viên chấm tay) cho dạng đề 12-2-4-4. Chạy sau 004_class_pins.sql.

alter table exam_sections drop constraint if exists exam_sections_section_type_check;
alter table exam_sections add constraint exam_sections_section_type_check
  check (section_type in ('single_choice', 'true_false', 'short_answer', 'essay'));

alter table exam_questions drop constraint if exists exam_questions_question_type_check;
alter table exam_questions add constraint exam_questions_question_type_check
  check (question_type in ('single_choice', 'true_false_group', 'true_false_item', 'short_answer', 'essay'));
