import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Questionnaire } from "@/components/insurance/Questionnaire";
import { PlanResults } from "@/components/insurance/PlanResults";
import { ComparisonMatrix } from "@/components/insurance/ComparisonMatrix";
import { AiAssistant } from "@/components/insurance/AiAssistant";
import { DEFAULT_ANSWERS, MOCK_POLICIES, buildPlans, type Answers, type Plan } from "@/data/insurance";
import { useInsuranceStore } from "@/store/useInsuranceStore";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const [answers, setAnswers] = useState<Answers>({ ...DEFAULT_ANSWERS });
  const [completed, setCompleted] = useState(false);
  const [highlightAnchor, setHighlightAnchor] = useState<{ anchor: string; nonce: number } | null>(null);
  const plans = useMemo(() => (completed ? buildPlans(answers) : []), [answers, completed]);
  const selectedPolicyIds = useInsuranceStore((state) => state.selectedPolicyIds);
  const selectPolicies = useInsuranceStore((state) => state.selectPolicies);
  const togglePolicySelection = useInsuranceStore((state) => state.togglePolicySelection);
  const selectedPolicies = MOCK_POLICIES.filter((policy) => selectedPolicyIds.includes(policy.id));

  const handleSubmit = () => {
    if (!answers.gender || !answers.ageConfirmed || !answers.budgetConfirmed) return;
    setCompleted(true);
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
            <Questionnaire answers={answers} setAnswers={setAnswers} onSubmit={handleSubmit} loading={false} />
          </div>
        </section>

        {completed && (
          <section id="plans" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-12">
            <PlanResults plans={plans} budget={answers.budget} onCompare={handleCompare} />
          </section>
        )}

        {completed && (
          <section className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16">
            <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">商品比較</h2>
                  <p className="text-sm text-muted-foreground">已選 {selectedPolicies.length} 款商品 · 最多可比較 8 款</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
                  返回推薦結果
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {MOCK_POLICIES.map((policy) => {
                  const selected = selectedPolicyIds.includes(policy.id);
                  return (
                    <Button
                      key={policy.id}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      onClick={() => togglePolicySelection(policy.id, !selected)}
                      disabled={!selected && selectedPolicyIds.length >= 8}
                    >
                      {selected ? "移除" : "加入"} {policy.company} · {policy.code}
                    </Button>
                  );
                })}
              </div>
            </div>
            <ComparisonMatrix
              policies={selectedPolicies}
              onRemove={(id) => togglePolicySelection(id, false)}
              highlightAnchor={highlightAnchor}
            />
          </section>
        )}
      </main>

      {completed && (
        <AiAssistant
          answers={answers}
          selectedPolicies={selectedPolicies}
          onViewDifference={(anchor) => setHighlightAnchor({ anchor, nonce: Date.now() })}
        />
      )}

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />個人化保險規劃工具</div>
        </div>
      </footer>
    </div>
  );
}
