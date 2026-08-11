import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { DISEASES } from "@/lib/constants";
import { useInsuranceStore } from "@/store/useInsuranceStore";
import { Gender, DiseaseKey } from "@/types";

export function InsuranceForm() {
  const { 
    gender, setGender, 
    age, setAge, 
    disease, setDisease, 
    loading, generateRecommendations 
  } = useInsuranceStore();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-[0.08]" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-10 md:pt-20 md:pb-16 relative">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              找到<span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent"> 真正適合你 </span>的健康保險
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              告訴我們你的基本資料與想關注的疾病類別，AI 將依照理賠透明度、賠付比例與市場口碑，在數秒內產出 10 張精選保單建議。
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />透明理賠標準</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />雙實付智慧配對</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />社群風評提示</div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border/70 p-6 md:p-8 shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-card)" }}>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">性別 Gender</Label>
                  <RadioGroup value={gender} onValueChange={(v) => setGender(v as Gender)} className="grid grid-cols-2 gap-2">
                    {[{ v: "male", label: "男 Male" }, { v: "female", label: "女 Female" }].map((o) => (
                      <Label
                        key={o.v}
                        htmlFor={`g-${o.v}`}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                          gender === o.v ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <RadioGroupItem value={o.v} id={`g-${o.v}`} />
                        <span className="text-sm">{o.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium">年齡 Age</Label>
                  <Input id="age" type="number" min={0} max={99} value={age} onChange={(e) => setAge(e.target.value)} className="h-11" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium">想問的疾病類別 Disease Category</Label>
                  <Select value={disease} onValueChange={(v) => setDisease(v as DiseaseKey)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISEASES.map((d) => {
                        const Icon = d.icon;
                        return (
                          <SelectItem key={d.value} value={d.value}>
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{d.label}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generateRecommendations} disabled={loading} size="lg" className="mt-6 w-full h-12 text-base bg-[image:var(--gradient-hero)] hover:opacity-95 transition-opacity shadow-[var(--shadow-soft)]">
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> AI 分析中… Generating</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> 生成保單推薦 Generate Recommendations</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}