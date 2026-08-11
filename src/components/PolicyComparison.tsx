import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { PAYOUT_META, MOCK_POLICIES } from "@/lib/constants";
import { useInsuranceStore } from "@/store/useInsuranceStore";

export function PolicyComparison() {
  const selectedPolicyIds = useInsuranceStore(state => state.selectedPolicyIds);
  const displayPolicies = useInsuranceStore(state => state.displayPolicies);
  
  const activePolicies = displayPolicies.length > 0 ? displayPolicies : MOCK_POLICIES;
  const selectedPolicies = activePolicies.filter(p => selectedPolicyIds.includes(p.id));

  if (selectedPolicies.length === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-end justify-between gap-3 mb-4 mt-10 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">保單比較表</h2>
          <p className="text-sm text-muted-foreground mt-1">目前比較 {selectedPolicies.length} 張保單 · 滑鼠移入 ⚠️ 查看社群來源</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[180px] font-semibold text-foreground">比較維度</TableHead>
                {selectedPolicies.map((p) => (
                  <TableHead key={p.id} className="min-w-[220px] font-semibold text-foreground">
                    <div className="flex items-center gap-1.5">
                      {p.company}
                      {p.flagged && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="cursor-pointer" aria-label="warning source">
                              <Tooltip>
                                <TooltipTrigger asChild><span className="text-warning text-base">⚠️</span></TooltipTrigger>
                                <TooltipContent side="top">點擊查看來源</TooltipContent>
                              </Tooltip>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72" side="top">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-warning font-semibold text-sm"><AlertTriangle className="h-4 w-4" /> 社群風評提示</div>
                              <div className="text-xs text-muted-foreground">來源 Source</div>
                              <div className="text-sm font-medium">{p.flagged.source}</div>
                              <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border">{p.flagged.note}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">{p.companyEn}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium align-top">
                  理賠標準<div className="text-xs text-muted-foreground font-normal mt-0.5">Payout Standards</div>
                </TableCell>
                {selectedPolicies.map((p) => {
                  const meta = PAYOUT_META[p.payoutStandard];
                  return (
                    <TableCell key={p.id} className="align-top">
                      <Badge variant="outline" className={meta.className}><meta.icon className="h-3.5 w-3.5 mr-1" />{meta.label}</Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium align-top">
                  類別與公司<div className="text-xs text-muted-foreground font-normal mt-0.5">Category & Type</div>
                </TableCell>
                {selectedPolicies.map((p) => (
                  <TableCell key={p.id} className="align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">{p.category}</Badge>
                      <span className="text-sm text-muted-foreground">{p.medicalType}</span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium align-top">
                  理賠金額<div className="text-xs text-muted-foreground font-normal mt-0.5">Payout Amount</div>
                </TableCell>
                {selectedPolicies.map((p) => (
                  <TableCell key={p.id} className="align-top">
                    <div className="font-semibold text-foreground">{p.payoutAmount}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">賠償比例 {p.payoutRatio}</div>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium align-top">
                  年繳保費<div className="text-xs text-muted-foreground font-normal mt-0.5">Annual Premium</div>
                </TableCell>
                {selectedPolicies.map((p) => (
                  <TableCell key={p.id} className="align-top">
                    <div className="text-primary font-bold text-lg">NT$ {p.premium.toLocaleString()}</div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}