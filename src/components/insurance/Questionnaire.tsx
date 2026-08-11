import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type Answers,
  EXISTING,
  IDENTITIES,
  INCOMES,
  INFO_STYLES,
  PREFERENCES,
  RISKS,
} from "@/data/insurance";

const STEPS = ["基本資訊", "身份家庭", "風險需求", "現有保障", "偏好設定"];

const TITLES: { title: string; subtitle: string }[] = [
  { title: "基本資訊", subtitle: "讓我們先了解您的基本情況" },
  { title: "身份與家庭", subtitle: "您的家庭狀況影響需要的保障組合" },
  { title: "風險與需求", subtitle: "告訴我們您最擔心什麼" },
  { title: "現有保障", subtitle: "避免重複投保，精準補足缺口" },
  { title: "偏好設定", subtitle: "最後一步，客製化您的推薦方案" },
];

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm text-left transition-all",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground font-medium"
          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
        {children}
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function Questionnaire({
  answers,
  setAnswers,
  onSubmit,
  loading,
}: {
  answers: Answers;
  setAnswers: (a: Answers) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [step, setStep] = useState(0);
  const patch = (p: Partial<Answers>) => setAnswers({ ...answers, ...p });

  const toggleRisk = (r: string) => {
    if (answers.risks.includes(r)) {
      patch({ risks: answers.risks.filter((x) => x !== r) });
      return;
    }
    if (answers.risks.length >= 3) {
      toast.warning("最多選擇 3 項最擔心的風險");
      return;
    }
    patch({ risks: [...answers.risks, r] });
  };

  const toggleExisting = (e: string) => {
    if (e === "完全沒有" || e === "不確定") {
      patch({ existing: answers.existing.includes(e) ? [] : [e] });
      return;
    }
    const base = answers.existing.filter((x) => x !== "完全沒有" && x !== "不確定");
    patch({
      existing: base.includes(e) ? base.filter((x) => x !== e) : [...base, e],
    });
  };

  return (
    <div
      className="rounded-2xl border border-border/70 p-6 md:p-8 shadow-[var(--shadow-elegant)]"
      style={{ background: "var(--gradient-card)" }}
    >
      {/* Progress */}
      <div className="flex items-center gap-1 md:gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1 md:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => i <= step && setStep(i)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <span
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center text-xs font-semibold border transition-all",
                  i < step
                    ? "bg-success text-white border-success"
                    : i === step
                      ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/15"
                      : "bg-background text-muted-foreground border-border",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[10px] md:text-xs whitespace-nowrap",
                  i === step ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {s}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-all -mt-5",
                  i < step ? "bg-success" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div key={step} className="mt-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{TITLES[step].title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{TITLES[step].subtitle}</p>

        <div className="mt-6 space-y-6">
          {step === 0 && (
            <>
              <Field label="年齡">
                <div className="max-w-xs">
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={18}
                      max={80}
                      value={answers.age}
                      onChange={(e) => patch({ age: Number(e.target.value) })}
                      className="h-11 text-base font-semibold text-primary"
                      aria-label="年齡"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">歲</span>
                  </div>
                  {(answers.age < 18 || answers.age > 80 || Number.isNaN(answers.age)) && (
                    <p className="mt-2 text-xs text-destructive">請輸入 18 – 80 之間的年齡</p>
                  )}
                </div>
              </Field>
              <Field label="性別">
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <Pill
                    active={answers.gender === "male"}
                    onClick={() => patch({ gender: "male" })}
                  >
                    男性
                  </Pill>
                  <Pill
                    active={answers.gender === "female"}
                    onClick={() => patch({ gender: "female" })}
                  >
                    女性
                  </Pill>
                </div>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="身份">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {IDENTITIES.map((i) => (
                    <Pill
                      key={i}
                      active={answers.identity === i}
                      onClick={() => patch({ identity: i })}
                    >
                      {i}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="家庭年收入（稅前）">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {INCOMES.map((i) => (
                    <Pill
                      key={i}
                      active={answers.income === i}
                      onClick={() => patch({ income: i })}
                    >
                      {i}
                    </Pill>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label={`您最擔心哪些風險？（最多 3 項 · 已選 ${answers.risks.length}/3）`}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {RISKS.map((r) => (
                    <Pill key={r} active={answers.risks.includes(r)} onClick={() => toggleRisk(r)}>
                      {r}
                    </Pill>
                  ))}
                </div>
              </Field>
              <div className="grid sm:grid-cols-2 gap-6">
                <Field label="是否有房貸？">
                  <div className="grid grid-cols-2 gap-3">
                    {["有房貸", "沒有"].map((o) => (
                      <Pill
                        key={o}
                        active={answers.mortgage === o}
                        onClick={() => patch({ mortgage: o })}
                      >
                        {o}
                      </Pill>
                    ))}
                  </div>
                </Field>
                <Field label="是否有需要扶養的家人？">
                  <div className="grid grid-cols-2 gap-3">
                    {["有需要撫養的人", "沒有"].map((o) => (
                      <Pill
                        key={o}
                        active={answers.dependents === o}
                        onClick={() => patch({ dependents: o })}
                      >
                        {o}
                      </Pill>
                    ))}
                  </div>
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="目前已有哪些保險？（可多選）">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {EXISTING.map((e) => (
                    <Pill
                      key={e}
                      active={answers.existing.includes(e)}
                      onClick={() => toggleExisting(e)}
                    >
                      {e}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="每月保險預算">
                <div className="rounded-xl border border-border bg-background/60 p-5">
                  <div className="text-3xl font-bold text-primary">
                    NT${answers.budget.toLocaleString()}{" "}
                    <span className="text-base font-medium text-muted-foreground">元/月</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    年繳約 NT${(answers.budget * 12).toLocaleString()}
                  </div>
                  <Slider
                    value={[answers.budget]}
                    min={2000}
                    max={30000}
                    step={100}
                    onValueChange={(v) => patch({ budget: v[0] })}
                    className="mt-5"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>NT$2,000</span>
                    <span>NT$30,000</span>
                  </div>
                </div>
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="保險偏好">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PREFERENCES.map((p) => (
                    <Pill
                      key={p}
                      active={answers.preference === p}
                      onClick={() => patch({ preference: p })}
                    >
                      {p}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="保單資訊呈現偏好">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INFO_STYLES.map((p) => (
                    <Pill
                      key={p}
                      active={answers.infoStyle === p}
                      onClick={() => patch({ infoStyle: p })}
                    >
                      {p}
                    </Pill>
                  ))}
                </div>
              </Field>

              <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  您的回答摘要
                </div>
                <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                  {[
                    ["年齡", `${answers.age} 歲（${answers.gender === "male" ? "男" : "女"}）`],
                    ["身份", answers.identity],
                    ["年收入", answers.income],
                    ["月預算", `NT$${answers.budget.toLocaleString()}`],
                    ["擔心風險", answers.risks.join("、") || "未選擇"],
                    ["已有保障", answers.existing.join("、") || "未選擇"],
                    ["偏好", answers.preference],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-muted-foreground shrink-0 w-20">{k}：</dt>
                      <dd className="font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          上一步
        </Button>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Step {step + 1} / {STEPS.length}
        </Badge>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="bg-[image:var(--gradient-hero)] hover:opacity-95"
          >
            下一步
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={loading}
            className="h-11 px-6 text-base bg-[image:var(--gradient-hero)] hover:opacity-95 shadow-[var(--shadow-soft)]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI 分析中…
              </>
            ) : (
              <>產出推薦方案 →</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
