"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton, Toast } from "@/components/ui/ActionForm";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/format";
import type { ActionResult } from "@/lib/actions/result";

type SingleQuestion = { id: string; question_no: number; correct_answer: string | null; score: number; topic: string | null };
type TfGroup = { id: string; question_no: number; topic: string | null; items: Array<{ id: string; sub_label: string | null; correct_answer: string | null }> };
type ShortQuestion = { id: string; question_no: number; correct_answers_json: string[] | null; score: number; topic: string | null };

const OPTIONS = ["A", "B", "C", "D"];

export function AnswerKeyForm({
  action,
  singles,
  groups,
  shorts,
  topicSuggestions
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  singles: SingleQuestion[];
  groups: TfGroup[];
  shorts: ShortQuestion[];
  topicSuggestions: string[];
}) {
  const [state, formAction] = useActionState(action, null);
  const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(singles.map((q) => [q.id, OPTIONS.includes(String(q.correct_answer ?? "").toUpperCase()) ? String(q.correct_answer).toUpperCase() : ""]))
  );
  const [tfAnswers, setTfAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.flatMap((group) => group.items.map((item) => [item.id, item.correct_answer === "true" || item.correct_answer === "false" ? item.correct_answer : ""])))
  );
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(shorts.map((q) => [q.id, (q.correct_answers_json ?? []).join("; ")]))
  );
  const [topics, setTopics] = useState<Record<string, string>>(() =>
    Object.fromEntries([...singles, ...groups, ...shorts].map((q) => [q.id, q.topic ?? ""]))
  );
  const [singlePaste, setSinglePaste] = useState("");
  const [tfPaste, setTfPaste] = useState("");
  const [bulkTopic, setBulkTopic] = useState({ topic: "", from: "", to: "" });

  const missing = useMemo(() => {
    const list: string[] = [];
    singles.forEach((q) => !singleAnswers[q.id] && list.push(`${q.question_no}`));
    groups.forEach((group) => group.items.forEach((item) => !tfAnswers[item.id] && list.push(`${group.question_no}${item.sub_label ?? ""}`)));
    shorts.forEach((q) => !shortAnswers[q.id]?.trim() && list.push(`${q.question_no}`));
    return list;
  }, [singles, groups, shorts, singleAnswers, tfAnswers, shortAnswers]);

  function applySinglePaste() {
    const letters = singlePaste.toUpperCase().replace(/[^ABCD]/g, "").split("");
    setSingleAnswers((current) => {
      const next = { ...current };
      singles.forEach((q, index) => {
        if (letters[index]) next[q.id] = letters[index];
      });
      return next;
    });
  }

  function applyTfPaste() {
    // Đ / D / T = Đúng, S / F = Sai.
    const values = tfPaste
      .toUpperCase()
      .replace(/Đ/g, "D")
      .replace(/[^DTSF]/g, "")
      .split("")
      .map((char) => (char === "S" || char === "F" ? "false" : "true"));
    setTfAnswers((current) => {
      const next = { ...current };
      groups.flatMap((group) => group.items).forEach((item, index) => {
        if (values[index]) next[item.id] = values[index];
      });
      return next;
    });
  }

  function applyBulkTopic() {
    const from = Number(bulkTopic.from);
    const to = Number(bulkTopic.to || bulkTopic.from);
    if (!bulkTopic.topic.trim() || !from) return;
    setTopics((current) => {
      const next = { ...current };
      [...singles, ...groups, ...shorts].forEach((q) => {
        if (q.question_no >= from && q.question_no <= to) next[q.id] = bulkTopic.topic.trim();
      });
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5 pb-40 md:pb-24">
      <datalist id="topic-suggestions">
        {topicSuggestions.map((topic) => (
          <option key={topic} value={topic} />
        ))}
      </datalist>

      <section className="surface grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 className="font-semibold">Gán chủ đề cho nhiều câu</h2>
          <p className="mt-1 text-sm text-slate-600">Chủ đề dùng để phân tích điểm mạnh / yếu của học sinh.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
            <Input list="topic-suggestions" placeholder="Chủ đề, VD: Tích phân" value={bulkTopic.topic} onChange={(event) => setBulkTopic({ ...bulkTopic, topic: event.target.value })} />
            <Input type="number" min={1} max={22} placeholder="Từ câu" value={bulkTopic.from} onChange={(event) => setBulkTopic({ ...bulkTopic, from: event.target.value })} />
            <Input type="number" min={1} max={22} placeholder="Đến câu" value={bulkTopic.to} onChange={(event) => setBulkTopic({ ...bulkTopic, to: event.target.value })} />
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={applyBulkTopic}>Áp dụng</Button>
      </section>

      <section className="surface p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold">Phần I. Trắc nghiệm</h2>
            <p className="text-sm text-slate-600">Bấm chọn đáp án đúng, hoặc dán nhanh cả chuỗi.</p>
          </div>
          <QuickPaste value={singlePaste} onChange={setSinglePaste} onApply={applySinglePaste} placeholder="VD: ABCDDCBAABCD" />
        </div>
        <div className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
          {singles.map((q) => (
            <div key={q.id} className={cn("grid grid-cols-[64px_auto_72px_1fr] items-center gap-2 rounded-xl px-2 py-1.5", !singleAnswers[q.id] && "bg-amber-50")}>
              <span className="font-semibold">Câu {q.question_no}</span>
              <div className="flex gap-1">
                {OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-sm font-bold transition",
                      singleAnswers[q.id] === option ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-400"
                    )}
                  >
                    <input
                      type="radio"
                      name={`answer_${q.id}`}
                      value={option}
                      className="sr-only"
                      checked={singleAnswers[q.id] === option}
                      onChange={() => setSingleAnswers({ ...singleAnswers, [q.id]: option })}
                    />
                    {option}
                  </label>
                ))}
              </div>
              <Input name={`score_${q.id}`} type="number" step="0.01" min={0} defaultValue={q.score} title="Điểm" className="px-2" />
              <TopicInput id={q.id} topics={topics} setTopics={setTopics} />
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold">Phần II. Đúng/Sai</h2>
            <p className="text-sm text-slate-600">Mỗi câu 4 ý, chấm 0 / 0,1 / 0,25 / 0,5 / 1 điểm theo số ý đúng.</p>
          </div>
          <QuickPaste value={tfPaste} onChange={setTfPaste} onApply={applyTfPaste} placeholder="16 ý, Đ/S. VD: ĐSSĐ SĐĐS ..." />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 grid grid-cols-[64px_1fr] items-center gap-2">
                <strong>Câu {group.question_no}</strong>
                <TopicInput id={group.id} topics={topics} setTopics={setTopics} />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div key={item.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", !tfAnswers[item.id] && "bg-amber-100")}>
                    <span className="w-6 font-semibold">{item.sub_label})</span>
                    {[
                      { value: "true", label: "Đúng" },
                      { value: "false", label: "Sai" }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={cn(
                          "cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition",
                          tfAnswers[item.id] === option.value
                            ? option.value === "true"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-rose-600 bg-rose-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        )}
                      >
                        <input
                          type="radio"
                          name={`tf_${item.id}`}
                          value={option.value}
                          className="sr-only"
                          checked={tfAnswers[item.id] === option.value}
                          onChange={() => setTfAnswers({ ...tfAnswers, [item.id]: option.value })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="font-semibold">Phần III. Trả lời ngắn</h2>
        <p className="mb-4 text-sm text-slate-600">Nhiều đáp án chấp nhận được thì ngăn cách bằng dấu chấm phẩy, VD: 0,5; 1/2.</p>
        <div className="grid gap-2">
          {shorts.map((q) => (
            <div key={q.id} className={cn("grid gap-2 rounded-xl px-2 py-1.5 md:grid-cols-[64px_2fr_72px_1fr] md:items-center", !shortAnswers[q.id]?.trim() && "bg-amber-50")}>
              <span className="font-semibold">Câu {q.question_no}</span>
              <Input
                name={`short_${q.id}`}
                placeholder="Đáp án"
                value={shortAnswers[q.id] ?? ""}
                onChange={(event) => setShortAnswers({ ...shortAnswers, [q.id]: event.target.value })}
              />
              <Input name={`score_${q.id}`} type="number" step="0.01" min={0} defaultValue={q.score} title="Điểm" className="px-2" />
              <TopicInput id={q.id} topics={topics} setTopics={setTopics} />
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-3 bottom-[5.5rem] z-40 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:inset-x-0 md:bottom-0 md:left-72 md:rounded-none md:border-x-0 md:border-b-0 md:group-data-[collapsed=true]/shell:left-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {missing.length ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                Còn {missing.length} câu/ý chưa có đáp án: {missing.slice(0, 10).join(", ")}
                {missing.length > 10 ? "…" : ""}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              Đã nhập đủ đáp án
            </p>
          )}
          <div className="flex gap-2">
            <SubmitButton variant="secondary" name="intent" value="save">Lưu nháp</SubmitButton>
            <SubmitButton name="intent" value="next">Lưu & giao lớp →</SubmitButton>
          </div>
        </div>
      </div>
      <Toast result={state} />
    </form>
  );
}

function QuickPaste({ value, onChange, onApply, placeholder }: { value: string; onChange: (value: string) => void; onApply: () => void; placeholder: string }) {
  return (
    <div className="flex gap-2 lg:w-[420px]">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onApply();
          }
        }}
      />
      <Button type="button" variant="secondary" className="shrink-0 gap-2" onClick={onApply}>
        <Wand2 size={16} />
        Điền nhanh
      </Button>
    </div>
  );
}

function TopicInput({ id, topics, setTopics }: { id: string; topics: Record<string, string>; setTopics: (value: Record<string, string>) => void }) {
  return (
    <Input
      name={`topic_${id}`}
      list="topic-suggestions"
      placeholder="Chủ đề"
      value={topics[id] ?? ""}
      onChange={(event) => setTopics({ ...topics, [id]: event.target.value })}
    />
  );
}
