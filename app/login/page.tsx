import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile?.role === "teacher") redirect("/teacher/dashboard");
  if (profile?.role === "student") redirect("/student/exams");

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <LoginForm />
    </main>
  );
}
