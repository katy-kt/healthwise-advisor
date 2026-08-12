import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Sparkles, Users } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Questionnaire } from "@/components/insurance/Questionnaire";
import { PlanResults } from "@/components/insurance/PlanResults";
import { InsuranceForm } from "@/components/InsuranceForm";
import { PolicyCard } from "@/components/PolicyCard";
import { PolicyComparison } from "@/components/PolicyComparison";
import { DualReimbursement } from "@/components/DualReimbursement";
import { DEFAULT_ANSWERS, MOCK_POLICIES, buildPlans, type Answers, type Plan } from "@/data/insurance";
import { useInsuranceStore } from "@/store/useInsuranceStore";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const [answers, setAnswers] = useState<Answers>({ ...DEFAULT_ANSWERS });
  const [completed, setCompleted] = useState(false);
  const plans = useMemo(() => (completed ? buildPlans(answers) : []), [answers, completed]);
  const selectedPolicyIds = useInsuranceStore((state) => state.selectedPolicyIds);
  const selectPolicies = useInsuranceStore((state) => state.selectPolicies);
  const loading = useInsuranceStore((state) => state.loading);
  const submitted = useInsuranceStore((state) => state.submitted);
  const aiSummary = useInsuranceStore((state) => state.aiSummary);
  const aiReasoning = useInsuranceStore((state) => state.aiReasoning);
  const displayPolicies = useInsuranceStore((state) => state.displayPolicies);
  const setGender = useInsuranceStore((state) => state.setGender);
  const setAge = useInsuranceStore((state) => state.setAge);
  const setDisease = useInsuranceStore((state) => state.setDisease);
  const generateRecommendations = useInsuranceStore((state) => state.generateRecommendations);
  const activePolicies = displayPolicies.length > 0 ? displayPolicies : MOCK_POLICIES;

  const handleSubmit = async () => {
    if (!answers.gender || !answers.ageConfirmed || !answers.budgetConfirmed) return;
    setCompleted(true);
    setGender(answers.gender);
    setAge(String(answers.age));
    setDisease(
      answers.risks.includes("意外受傷")
        ? "accident"
        : answers.risks.includes("住院醫療花費")
          ? "surgery"
          : "cancer",
    );
    await generateRecommendations();
    setTimeout(() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleCompare = (plan: Plan) => {
    selectPolicies(plan.items.map((item) => item.policyId));
    setTimeout(() => document.getElementById("comparison")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">InsuranceMatch AI</div>
              <div className="-mt-0.5 text-[11px] text-muted-foreground">智慧保險推薦系統</div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-[0.08]" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-16">
            <div className="mb-8 text-center">
              <Badge className="mb-3 bg-primary/10 text-primary">Step 1 · 個人化問卷</Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                找到<span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">真正適合你</span>的健康保險
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">完成五個步驟，我們會依照您實際提供的資料，在預算內整理三種保障策略。</p>
            </div>
            <Questionnaire answers={answers} setAnswers={setAnswers} onSubmit={handleSubmit} loading={loading} />
          </div>
        </section>

        <InsuranceForm />

        {completed && answers.budget !== null && (
          <section id="plans" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
            <PlanResults plans={plans} budget={answers.budget} onCompare={handleCompare} />
          </section>
        )}

        {(completed || submitted) && (
          <section id="comparison" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16">
            <Tabs defaultValue="recommendations">
              <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
                <TabsTrigger value="recommendations"><Shield className="mr-1.5 h-4 w-4" />保單清單與比較</TabsTrigger>
                <TabsTrigger value="dual"><Sparkles className="mr-1.5 h-4 w-4" />雙實付智慧推薦</TabsTrigger>
              </TabsList>
              <TabsContent value="recommendations" className="space-y-6">
                {submitted && aiSummary && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" />AI 推薦摘要</div>
                    <p className="text-sm leading-7 text-foreground">{aiSummary}</p>
                    <div className="flex flex-wrap gap-2">
                      {aiReasoning.map((reason, index) => <Badge key={`${reason}-${index}`} variant="secondary" className="bg-background">{reason}</Badge>)}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">推薦保單清單</h2>
                    <p className="mt-1 text-sm text-muted-foreground">可手動勾選最多 3 張，或從上方方案一鍵帶入。</p>
                  </div>
                  <div className="text-sm text-muted-foreground">已選擇 <span className="font-semibold text-primary">{selectedPolicyIds.length}</span> / 3</div>
                </div>
                <Accordion type="multiple" className="space-y-3">
                  {activePolicies.map((policy, index) => <PolicyCard key={policy.id} policy={policy} index={index} />)}
                </Accordion>
                <PolicyComparison />
              </TabsContent>
              <TabsContent value="dual"><DualReimbursement /></TabsContent>
            </Tabs>
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />個人化保險規劃工具</div>
        </div>
      </footer>
    </div>
  );
}
