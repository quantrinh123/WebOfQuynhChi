import { AppShell } from "@/components/layout/AppShell";
import { StudentBackdrop } from "@/components/student/StudentBackdrop";
import { requireStudent } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();
  return (
    <>
      <StudentBackdrop />
      <AppShell role="student" userName={student.full_name}>
        {children}
      </AppShell>
    </>
  );
}
