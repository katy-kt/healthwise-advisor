import { createFileRoute } from "@tanstack/react-router";
import { Shield, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";

import { useInsuranceStore } from "@/store/useInsuranceStore";
import { MOCK_POLICIES, DISEASES } from "@/lib/constants";

import { InsuranceForm } from "@/components/InsuranceForm";
import { PolicyCard } from "@/components/PolicyCard";
import { PolicyComparison } from "@/components/PolicyComparison";
import { DualReimbursement } from "@/components/DualReimbursement";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  // 只拿出在佈局層次需要知道的狀態
  const submitted = useInsuranceStore(state => state.submitted);
  const displayPolicies = useInsuranceStore(state => state.displayPolicies);
  const aiSummary = useInsuranceStore(state => state.aiSummary);
  const aiReasoning = useInsuranceStore(state => state.aiReasoning);
  const selectedPolicyIds = useInsuranceStore(state => state.selectedPolicyIds);
  
  const gender = useInsuranceStore(state => state.gender);
  const age = useInsuranceStore(state => state.age);
  const disease = useInsuranceStore(state => state.disease);
  
  const activePolicies = displayPolicies.length > 0 ? displayPolicies : MOCK_POLICIES;
  const diseaseLabel = DISEASES.find(d => d.value === disease)?.label ?? "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl grid place-items-center bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-foreground">InsuranceMatch AI</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">智慧保險推薦系統</div>
            </div>
          </div>
        </div>
      </header>

      {/* 不再需要傳入任何 props！ */}
      <InsuranceForm />

      {submitted && (
        <section id="results" className="mx-auto max-w-7xl px-4 pb-16 animate-in fade-in duration-500">
          <Tabs defaultValue="recommendations" className="w-full">
            <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 mb-6">
              <TabsTrigger value="recommendations"><Shield className="h-4 w-4 mr-1.5" />推薦清單</TabsTrigger>
              <TabsTrigger value="dual"><Sparkles className="h-4 w-4 mr-1.5" />雙實付智慧推薦</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">10 張精選保單</h2>
                  <p className="text-sm text-muted-foreground mt-1">根據 {gender === "male" ? "男性" : "女性"} · {age} 歲 · {diseaseLabel} 產生</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  已選擇 <span className="text-primary font-semibold">{selectedPolicyIds.length}</span> / 3
                </div>
              </div>

              {aiSummary && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" /> AI 推薦摘要
                  </div>
                  <p className="text-sm leading-7 text-foreground">{aiSummary}</p>
                  <div className="flex flex-wrap gap-2">
                    {aiReasoning.map((reason, idx) => (
                      <Badge key={`${reason}-${idx}`} variant="secondary" className="bg-background">{reason}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Accordion type="multiple" className="space-y-3">
                {activePolicies.map((p, idx) => (
                  <PolicyCard key={p.id} policy={p} index={idx} />
                ))}
              </Accordion>

              {/* 不再需要傳入 props！ */}
              <PolicyComparison />
            </TabsContent>

            <TabsContent value="dual">
              {/* 不再需要傳入 props！ */}
              <DualReimbursement />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-2 justify-between">
          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 為大學生 & 新鮮人設計</div>
        </div>
      </footer>
    </div>
  );
}