import { UserPlus, Users } from "lucide-react";
import { addStudentToClass, createStudentAndAddToClass, deleteClass, removeStudentFromClass, updateClass } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExamStatusBadge } from "@/components/exam/Badges";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/format";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: classInfo } = await supabase.from("classes").select("*").eq("id", id).single();
  const { data: students } = await supabase.from("class_students").select("profiles(id, full_name, created_at)").eq("class_id", id);
  const { data: assignments } = await supabase
    .from("exam_assignments")
    .select("id, start_time, end_time, created_at, exams(id, title, status, duration_minutes)")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const addExistingAction = addStudentToClass.bind(null, id);
  const createStudentAction = createStudentAndAddToClass.bind(null, id);
  const updateAction = updateClass.bind(null, id);

  return (
    <>
      <PageHeader
        title={classInfo?.name ?? "Lớp học"}
        description={classInfo?.description ?? "Quản lý học sinh và đề đã giao cho lớp này."}
        action={
          <form action={deleteClass.bind(null, id)}>
            <ConfirmSubmitButton message={`Xoá lớp ${classInfo?.name ?? ""}? Toàn bộ liên kết học sinh và giao đề của lớp này sẽ bị xoá.`}>Xoá lớp</ConfirmSubmitButton>
          </form>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <form action={updateAction} className="surface grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]">
            <Input name="name" defaultValue={classInfo?.name ?? ""} placeholder="Tên lớp" required />
            <Input name="description" defaultValue={classInfo?.description ?? ""} placeholder="Mô tả lớp" />
            <Button>Cập nhật lớp</Button>
          </form>

          <section className="table-shell">
            <div className="flex items-center gap-3 border-b border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Users size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Học sinh trong lớp</h2>
                <p className="text-sm text-slate-600">{students?.length ?? 0} học sinh</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="p-3">Họ tên</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students?.map((row: any) => (
                    <tr key={row.profiles.id} className="border-t">
                      <td className="p-3 font-medium">{row.profiles.full_name}</td>
                      <td className="p-3 text-slate-500">{row.profiles.id}</td>
                      <td className="p-3">
                        <form action={removeStudentFromClass.bind(null, id, row.profiles.id)}>
                          <ConfirmSubmitButton message={`Xoá ${row.profiles.full_name} khỏi lớp này?`}>Xoá khỏi lớp</ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="table-shell">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold">Đề đã giao cho lớp</h2>
              <p className="mt-1 text-sm text-slate-600">Các đề học sinh trong lớp này có thể thấy trong tài khoản của mình.</p>
            </div>
            {!assignments?.length ? (
              <div className="p-4 text-sm text-slate-600">Lớp này chưa được giao đề nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="p-3">Tên đề</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Thời gian làm</th>
                      <th className="p-3">Bắt đầu</th>
                      <th className="p-3">Kết thúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment: any) => (
                      <tr key={assignment.id} className="border-t">
                        <td className="p-3 font-medium">{assignment.exams?.title}</td>
                        <td className="p-3"><ExamStatusBadge status={assignment.exams?.status ?? "draft"} /></td>
                        <td className="p-3">{assignment.exams?.duration_minutes} phút</td>
                        <td className="p-3">{formatDateTime(assignment.start_time)}</td>
                        <td className="p-3">{formatDateTime(assignment.end_time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <form action={createStudentAction} className="surface grid gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="font-semibold">Tạo tài khoản học sinh</h2>
                <p className="text-sm text-slate-600">Tạo tài khoản đăng nhập và thêm vào lớp.</p>
              </div>
            </div>
            <Input name="full_name" placeholder="Họ tên học sinh" required />
            <Input name="email" type="email" placeholder="Email đăng nhập" required />
            <Input name="password" type="text" placeholder="Mật khẩu ban đầu, tối thiểu 6 ký tự" required minLength={6} />
            <Button>Tạo tài khoản</Button>
          </form>

          <form action={addExistingAction} className="surface grid gap-3 p-4">
            <h2 className="font-semibold">Thêm học sinh đã có tài khoản</h2>
            <p className="text-sm text-slate-600">Dùng khi học sinh đã được tạo tài khoản trước đó.</p>
            <Input name="email" type="email" placeholder="Email học sinh" required />
            <Button variant="secondary">Thêm vào lớp</Button>
          </form>
        </aside>
      </div>
    </>
  );
}
