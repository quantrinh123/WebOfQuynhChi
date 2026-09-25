import { AppShell } from "@/components/layout/AppShell";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const teacher = await requireTeacher();
  return (
    <AppShell role="teacher" userName={teacher.full_name}>
      {children}
    </AppShell>
  );
}
