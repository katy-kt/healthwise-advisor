import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shield, Sparkles, Info, CheckCircle2, TrendingUp, Activity, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

import { Questionnaire } from "@/components/insurance/Questionnaire";
import { PlanResults } from "@/components/insurance/PlanResults";
import { ComparisonMatrix } from "@/components/insurance/ComparisonMatrix";
import { AiAssistant } from "@/components/insurance/AiAssistant";
import {
  type Answers,
  type Gender,
  type Plan,
  buildPlans,
  DEFAULT_ANSWERS,
  DISEASES,
  MAX_COMPARE,
  MOCK_POLICIES,
  PAYOUT_META,
} from "@/data/insurance";

export const Route = createFileRoute("/")({
  component: Index,
});

const RISK_TO_DISEASE: Record<string, string> = {
  重大疾病: "cancer",
  住院醫療花費: "surgery",
  意外受傷: "accident",
  長期照護: "cardio",
};

function Index() {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [highlightAnchor, setHighlightAnchor] = useState<{
    anchor: string;
    nonce: number;
  } | null>(null);
  const [plans, setPlans] = useState<Plan[]>(() => buildPlans(DEFAULT_ANSWERS));

  const gender: Gender = answers.gender;
  const age = String(answers.age);
  const disease = answers.risks.map((r) => RISK_TO_DISEASE[r]).find(Boolean) ?? "cancer";
  const diseaseLabel = DISEASES.find((d) => d.value === disease)?.label ?? "";

  const handleGenerate = () => {
    setLoading(true);
    setSubmitted(false);
    setSelected([]);
    setPlans(buildPlans(answers));
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("已為您產出 3 個個人化方案", {
        description: "可切換精簡／標準／完整版，並一鍵比較方案內保單",
      });
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1400);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      if (selected.length >= MAX_COMPARE) {
        toast.warning(`最多只能選擇 ${MAX_COMPARE} 張保單進行比較`, {
          description: `Maximum ${MAX_COMPARE} policies can be compared`,
        });
        return;
      }
      setSelected((s) => [...s, id]);
    } else {
      setSelected((s) => s.filter((x) => x !== id));
    }
  };

  const comparePlan = (plan: Plan) => {
    const ids = Array.from(new Set(plan.items.map((i) => i.policyId))).slice(0, MAX_COMPARE);
    setSelected(ids);
    toast.success(`已載入「${plan.name}」的 ${ids.length} 張保單至比較表`);
    setTimeout(() => {
      document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const selectedPolicies = useMemo(
    () => MOCK_POLICIES.filter((p) => selected.includes(p.id)),
    [selected],
  );

  const viewDifference = (anchor: string) => {
    setHighlightAnchor({ anchor, nonce: Date.now() });
  };

  const matchScore = useMemo(() => {
    const a = answers.age;
    let base = 68;
    if (disease === "cancer") base += a < 30 ? 6 : a < 50 ? 14 : 20;
    if (disease === "cardio") base += a < 40 ? 4 : 18;
    if (disease === "accident") base += a < 30 ? 22 : 10;
    if (disease === "surgery") base += 12;
    if (gender === "female" && disease === "cancer") base += 4;
    return Math.min(97, base);
  }, [answers.age, gender, disease]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl grid place-items-center bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-foreground">InsureMatch AI</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">智慧保險推薦系統</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered · 透明推薦邏輯
          </div>
        </div>
      </header>

      {/* Hero + Questionnaire */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-[0.08]"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 pt-12 pb-10 md:pt-20 md:pb-16 relative">
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <Badge className="bg-teal/15 text-teal border-teal/30 hover:bg-teal/20">
                Step 1 · 5 步問卷
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                找到
                <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
                  {" "}
                  真正適合你{" "}
                </span>
                的保險組合
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                回答 5 個簡單步驟，AI 將依照您的身份、風險擔憂、現有保障與預算，
                產出精簡／標準／完整三種個人化方案，並可一鍵帶入保單比較表。
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  透明理賠標準
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  雙實付智慧配對
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  社群風評提示
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <Questionnaire
                answers={answers}
                setAnswers={setAnswers}
                onSubmit={handleGenerate}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {submitted && (
        <section
          id="results"
          className="mx-auto max-w-7xl px-4 pb-16 animate-in fade-in duration-500"
        >
          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 mb-6">
              <TabsTrigger value="plans">
                <Sparkles className="h-4 w-4 mr-1.5" />
                個人化方案
              </TabsTrigger>
              <TabsTrigger value="recommendations">
                <Shield className="h-4 w-4 mr-1.5" />
                推薦清單
              </TabsTrigger>
              <TabsTrigger value="dual">
                <Activity className="h-4 w-4 mr-1.5" />
                雙實付智慧推薦
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-8">
              <PlanResults onCompare={comparePlan} plans={plans} budget={answers.budget} />
              <ComparisonMatrix
                policies={selectedPolicies}
                onRemove={(id) => toggleSelect(id, false)}
                highlightAnchor={highlightAnchor}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Badge className="bg-teal/15 text-teal border-teal/30 mb-2">推薦結果</Badge>
                  <h2 className="text-2xl font-bold tracking-tight">10 張精選保單</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    根據 {gender === "male" ? "男性" : "女性"} · {age} 歲 · {diseaseLabel} 產生
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  已選擇 <span className="text-primary font-semibold">{selected.length}</span> /{" "}
                  {MAX_COMPARE}
                </div>
              </div>

              <Accordion type="multiple" className="space-y-3">
                {MOCK_POLICIES.map((p, idx) => {
                  const meta = PAYOUT_META[p.payoutStandard];
                  const isSel = selected.includes(p.id);
                  return (
                    <AccordionItem
                      key={p.id}
                      value={p.id}
                      className={`rounded-xl border bg-card px-4 md:px-5 transition-all ${
                        isSel
                          ? "border-primary ring-2 ring-primary/20 shadow-[var(--shadow-soft)]"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 py-1">
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={(c) => toggleSelect(p.id, Boolean(c))}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5"
                          aria-label={`select ${p.policyName}`}
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline py-4">
                          <div className="flex flex-1 items-center gap-4 text-left">
                            <div className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                              {String(idx + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                              <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                {p.company}
                                {p.flagged && <span className="text-warning">⚠️</span>}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {p.category}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {p.medicalType}
                              </div>
                              <div className="text-sm font-semibold text-primary">
                                NT$ {p.premium.toLocaleString()}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                  /年
                                </span>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="pb-5 pt-0">
                        <div className="pl-0 sm:pl-14 space-y-3">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              保單名稱 Policy Name
                            </div>
                            <div className="font-semibold text-foreground">{p.policyName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              保單代號 {p.code}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {p.description}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className={meta.className}>
                              <meta.icon className="h-3.5 w-3.5 mr-1" />
                              {meta.label}
                            </Badge>
                            <Badge variant="outline" className="border-border">
                              理賠 {p.payoutAmount} · {p.payoutRatio}
                            </Badge>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <ComparisonMatrix
                policies={selectedPolicies}
                onRemove={(id) => toggleSelect(id, false)}
                highlightAnchor={highlightAnchor}
              />
            </TabsContent>

            <TabsContent value="dual">
              <DualReimbursement
                score={matchScore}
                gender={gender}
                age={age}
                diseaseLabel={diseaseLabel}
              />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-2 justify-between">
          <div>© 2026 InsureMatch AI · Demo 使用模擬資料</div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> 為大學生 & 新鮮人設計
          </div>
        </div>
      </footer>

      <AiAssistant
        answers={answers}
        selectedPolicies={selectedPolicies}
        onViewDifference={viewDifference}
      />
    </div>
  );
}

function DualReimbursement({
  score,
  gender,
  age,
  diseaseLabel,
}: {
  score: number;
  gender: Gender;
  age: string;
  diseaseLabel: string;
}) {
  const factors = [
    { label: "年齡風險加權", value: Math.min(95, 40 + parseInt(age || "0", 10)), icon: TrendingUp },
    { label: "疾病類別匹配", value: 88, icon: Activity },
    { label: "雙實付覆蓋率", value: 92, icon: Shield },
    { label: "社群風評指數", value: 81, icon: Users },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div
        className="lg:col-span-1 rounded-2xl p-6 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-elegant)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <Badge className="bg-white/20 border-white/30 text-primary-foreground hover:bg-white/25">
          BONUS · 雙實付智慧推薦
        </Badge>
        <div className="mt-5">
          <div className="text-sm opacity-80">你的契合度 Match Rate</div>
          <div className="text-6xl font-bold tracking-tight mt-1">{score}%</div>
          <div className="text-xs opacity-80 mt-1">
            {gender === "male" ? "男性" : "女性"} · {age} 歲 · {diseaseLabel}
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <div className="text-sm font-medium">推薦保單組合</div>
          <div className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-3 text-sm">
            <div className="font-semibold">國泰康健守護 + 中國人壽雙實付</div>
            <div className="text-xs opacity-80 mt-1">正副本併行 · 雜費上限 NT$380,000</div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-tight">為什麼推薦這個組合？</h3>
              <p className="text-sm text-muted-foreground mt-1">
                解決「大學生被盲目推薦癌症險、不知推薦標準」的痛點
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="explanation">
                  <Info className="h-4 w-4 text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="left">
                <div className="space-y-2">
                  <div className="font-semibold text-sm">計算邏輯 Calculation</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    契合度 = 年齡風險加權 × 30% + 疾病類別匹配 × 30% + 雙實付覆蓋率 × 25% + 社群風評
                    × 15%。 所有分數皆基於公開理賠數據與社群討論指標。
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {factors.map((f) => (
              <div key={f.label} className="rounded-lg border border-border p-4 bg-background/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <f.icon className="h-4 w-4 text-primary" />
                  {f.label}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{f.value}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <Progress value={f.value} className="mt-2 h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            為什麼需要「雙實付」？
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              健保住院自付雜費、病房費升等常超過單張保單上限，需第二張補足缺口。
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              副本理賠可將醫療收據提交至兩家保險公司，降低自負比例。
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              系統會比對兩張保單條款重疊處，避免重複繳費。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
