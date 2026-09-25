import { redirect } from "next/navigation";

// Kết quả đã gộp vào danh sách đề và trang từng đề.
export default function TeacherResultsPage() {
  redirect("/teacher/exams");
}
