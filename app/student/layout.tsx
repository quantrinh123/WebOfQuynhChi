import { AppShell } from "@/components/layout/AppShell";
import { StudentSidebar } from "@/components/layout/StudentSidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell sidebar={<StudentSidebar />}>{children}</AppShell>;
}
