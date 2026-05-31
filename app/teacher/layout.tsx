import { AppShell } from "@/components/layout/AppShell";
import { TeacherSidebar } from "@/components/layout/TeacherSidebar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AppShell sidebar={<TeacherSidebar />}>{children}</AppShell>;
}
