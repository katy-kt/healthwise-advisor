import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Policy } from "@/types";
import { PAYOUT_META } from "@/lib/constants";
import { useInsuranceStore } from "@/store/useInsuranceStore";

interface Props {
  policy: Policy;
  index: number;
}

export function PolicyCard({ policy, index }: Props) {
  const meta = PAYOUT_META[policy.payoutStandard];
  
  // 從 Store 獲取選取狀態與操作
  const selectedPolicyIds = useInsuranceStore(state => state.selectedPolicyIds);
  const togglePolicySelection = useInsuranceStore(state => state.togglePolicySelection);
  const isSelected = selectedPolicyIds.includes(policy.id);

  return (
    <AccordionItem
      value={policy.id}
      className={`rounded-xl border bg-card px-4 md:px-5 transition-all ${
        isSelected ? "border-primary ring-2 ring-primary/20 shadow-[var(--shadow-soft)]" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 py-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(c) => togglePolicySelection(policy.id, Boolean(c))}
          onClick={(e) => e.stopPropagation()}
          className="h-5 w-5"
          aria-label={`select ${policy.policyName}`}
        />
        <AccordionTrigger className="flex-1 hover:no-underline py-4">
          <div className="flex flex-1 items-center gap-4 text-left">
            <div className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-2 sm:gap-4 items-center">
              <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                {policy.company}
                {policy.flagged && <span className="text-warning">⚠️</span>}
              </div>
              <div className="text-sm text-muted-foreground truncate">{policy.category}</div>
              <div className="text-sm text-muted-foreground truncate">{policy.medicalType}</div>
              <div className="text-sm font-semibold text-primary">
                NT$ {policy.premium.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/年</span>
              </div>
            </div>
          </div>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pb-5 pt-0">
        <div className="pl-0 sm:pl-14 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">保單名稱 Policy Name</div>
            <div className="font-semibold text-foreground">{policy.policyName}</div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{policy.description}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className={meta.className}>
              <meta.icon className="h-3.5 w-3.5 mr-1" />
              {meta.label}
            </Badge>
            <Badge variant="outline" className="border-border">
              理賠 {policy.payoutAmount} · {policy.payoutRatio}
            </Badge>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}