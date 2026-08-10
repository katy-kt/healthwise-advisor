import { useState } from "react";
import { CheckCircle2, Layers, Scale, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Plan,
  type PlanTier,
  PLANS,
  planMonthly,
  policyById,
} from "@/data/insurance";

function PlanCard({ plan, onCompare }: { plan: Plan; onCompare: (p: Plan) => void }) {
  const monthly = planMonthly(plan);
  const required = plan.items.filter((i) => i.level === "必備").length;
  const suggested = plan.items.length - required;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-3xl font-bold text-primary">
              NT${monthly.toLocaleString()}
              <span className="text-sm font-medium text-muted-foreground"> / 月</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              年繳 NT${(monthly * 12).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-teal" />
            <span className="font-semibold">{plan.items.length}</span> 個險種
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="font-semibold">{required}</span> 必備 /{" "}
            <span className="font-semibold">{suggested}</span> 建議
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {plan.items.map((item) => {
          const p = policyById(item.policyId);
          return (
            <div
              key={`${plan.tier}-${item.policyId}`}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    item.level === "必備"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-teal/15 text-teal border-teal/30"
                  }
                >
                  {item.level}
                </Badge>
                <span className="font-semibold">{item.categoryLabel}</span>
                <span className="text-sm text-muted-foreground">· {p.company}</span>
                <div className="ml-auto text-sm font-semibold text-primary">
                  約 NT${item.monthly.toLocaleString()} / 月
                </div>
              </div>
              <div className="mt-2.5 text-sm">
                <span className="font-medium text-foreground">{p.policyName}</span>
                <span className="text-xs text-muted-foreground ml-2">保單代號 {p.code}</span>
              </div>
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <div className="text-xs font-semibold text-foreground">為什麼你需要：</div>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.reason}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={() => onCompare(plan)}
        size="lg"
        className="w-full h-12 text-base bg-[image:var(--gradient-hero)] hover:opacity-95 shadow-[var(--shadow-soft)]"
      >
        <Scale className="h-5 w-5" />
        一鍵比較此方案（{plan.items.length} 項）
      </Button>
    </div>
  );
}

export function PlanResults({ onCompare }: { onCompare: (plan: Plan) => void }) {
  const [tier, setTier] = useState<PlanTier>("standard");

  return (
    <div className="space-y-5">
      <div>
        <Badge className="bg-teal/15 text-teal border-teal/30 mb-2">Step 2 · 個人化方案</Badge>
        <h2 className="text-2xl font-bold tracking-tight">根據您的回答產出 3 個方案</h2>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <Wallet className="h-4 w-4" />
          三個方案代表不同保障程度，非排名高低
        </p>
      </div>

      <Tabs value={tier} onValueChange={(v) => setTier(v as PlanTier)}>
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-3 mb-5">
          {PLANS.map((p) => (
            <TabsTrigger key={p.tier} value={p.tier}>
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {PLANS.map((p) => (
          <TabsContent key={p.tier} value={p.tier} className="animate-in fade-in duration-300">
            <PlanCard plan={p} onCompare={onCompare} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
