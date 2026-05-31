# Luyện thi Toán THPT

MVP Next.js cho giáo viên tạo đề Toán THPT 2025, upload PDF đề thi/đáp án, nhập đáp án 22 câu, giao đề cho lớp, học sinh làm bài online và hệ thống tự chấm điểm.

## Tech stack

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase PostgreSQL, Auth, Storage
- Server Actions cho thao tac server-side
- PDF viewer MVP bang `iframe` va signed URL

## Cài đặt

```bash
npm install
cp .env.example .env
npm run dev
```

Cap nhat `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Không commit file `.env`.

## Supabase

1. Tạo Supabase project.
2. Vao SQL Editor va chay `db/schema.sql`.
3. Vao Storage, tao private bucket ten `exam-pdfs`.
4. Tạo user trong Authentication:
   - 1 giáo viên
   - 2 học sinh
5. Insert profile tương ứng vào bảng `profiles` với role `teacher` hoặc `student`.

`db/seed.sql` có mẫu lớp 12A1, nhưng cần thay UUID bằng Auth user ID thật trước khi chạy.

## Flow test

1. Login teacher.
2. Tạo lớp.
3. Thêm student bằng email đã có trong Supabase Auth hoặc tạo tài khoản học sinh ngay trong trang chi tiết lớp.
4. Tạo đề, upload PDF đề thi và PDF đáp án.
5. Nhập đáp án 22 câu.
6. Giao đề cho lớp.
7. Login student.
8. Bắt đầu làm bài.
9. Trả lời và nộp bài.
10. Xem điểm nếu giáo viên cho phép.
11. Teacher xem kết quả và phân tích câu sai.

## Ghi chu bao mat

- `SUPABASE_SERVICE_ROLE_KEY` chi duoc dung trong server actions/server components.
- PDF đáp án không public. Học sinh chỉ nhận signed URL khi `show_answer_after_submit = true`.
- Student UI khong query dap an dung truc tiep. Logic cham diem chay server-side.
- RLS trong `schema.sql` la bo policy MVP. App van dung service role cho cac thao tac nhay cam de tranh expose secret ra client.
