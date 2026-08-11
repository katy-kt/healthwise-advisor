import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Activity, Shield, Users, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { useInsuranceStore } from "@/store/useInsuranceStore";
import { useMatchingScore } from "@/hooks/useMatchingScore";
import { DISEASES } from "@/lib/constants";

export function DualReimbursement() {
  const { gender, age, disease } = useInsuranceStore();
  const score = useMatchingScore();
  const diseaseLabel = DISEASES.find(d => d.value === disease)?.label ?? "";

  const factors = [
    { label: "年齡風險加權", value: Math.min(95, 40 + parseInt(age || "0", 10)), icon: TrendingUp },
    { label: "疾病類別匹配", value: 88, icon: Activity },
    { label: "雙實付覆蓋率", value: 92, icon: Shield },
    { label: "社群風評指數", value: 81, icon: Users },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 rounded-2xl p-6 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <Badge className="bg-white/20 border-white/30 text-primary-foreground hover:bg-white/25">BONUS · 雙實付智慧推薦</Badge>
        <div className="mt-5">
          <div className="text-sm opacity-80">你的契合度 Match Rate</div>
          <div className="text-6xl font-bold tracking-tight mt-1">{score}%</div>
          <div className="text-xs opacity-80 mt-1">{gender === "male" ? "男性" : "女性"} · {age} 歲 · {diseaseLabel}</div>
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
            <div><h3 className="text-lg font-bold tracking-tight">為什麼推薦這個組合？</h3></div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="explanation"><Info className="h-4 w-4 text-primary" /></Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" side="left">
                <div className="space-y-2">
                  <div className="font-semibold text-sm">計算邏輯 Calculation</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    契合度 = 年齡風險加權 × 30% + 疾病類別匹配 × 30% + 雙實付覆蓋率 × 25% + 社群風評 × 15%。
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {factors.map((f) => (
              <div key={f.label} className="rounded-lg border border-border p-4 bg-background/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><f.icon className="h-4 w-4 text-primary" />{f.label}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{f.value}</span><span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <Progress value={f.value} className="mt-2 h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> 為什麼需要「雙實付」？</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> 健保住院自付雜費、病房費升等常超過單張保單上限，需第二張補足缺口。</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> 副本理賠可將醫療收據提交至兩家保險公司，降低自負比例。</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> 系統會比對兩張保單條款重疊處，避免重複繳費。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}