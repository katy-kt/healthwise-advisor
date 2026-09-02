import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Highlighter,
  ListChecks,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type CompareRow,
  type Policy,
  COMPARE_GROUPS,
  PAYOUT_META,
  rowIsIdentical,
} from "@/data/insurance";
import { cn } from "@/lib/utils";

export const rowDomId = (groupId: string, rowId: string) => `cmp-${groupId}-${rowId}`;

function Cell({ row, policy }: { row: CompareRow; policy: Policy }) {
  const v = row.get(policy);
  if (
  v === undefined ||
  v === null ||
  v === "" ||
  (Array.isArray(v) && v.length === 0)
) {
  return (
    <span className="text-muted-foreground">
      X
    </span>
  );
}

  if (row.kind === "payoutBadge") {
    const meta = PAYOUT_META[policy.payoutStandard];
    return (
      <Badge variant="outline" className={meta.className}>
        <meta.icon className="h-3.5 w-3.5 mr-1" />
        {meta.label}
      </Badge>
    );
  }

  if (row.kind === "premium") {
    return (
      <div>
        <div className="text-primary font-bold text-base">
          NT$ {policy.premium.toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground"> /年</span>
        </div>
        <div className="text-xs text-muted-foreground">
          約 NT$ {Math.round(policy.premium / 12).toLocaleString()} /月
        </div>
      </div>
    );
  }

  if (row.kind === "badges") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(v as string[]).map((x) => (
          <Badge key={x} variant="secondary" className="font-normal">
            {x}
          </Badge>
        ))}
      </div>
    );
  }

  if (row.kind === "list") {
    return (
      <ul className="space-y-1">
        {(v as string[]).map((x) => (
          <li key={x} className="flex gap-1.5 text-sm leading-relaxed">
            <span className="text-muted-foreground">·</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    );
  }

if (row.kind === "links") {
  const url = String(v);

  if (url === "X") {
    return (
      <span className="text-muted-foreground">
        X
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      查看文件{" "}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

  return <span className="text-sm leading-relaxed">{String(v)}</span>;
}

export function ComparisonMatrix({
  policies,
  onRemove,
  highlightAnchor,
}: {
  policies: Policy[];
  onRemove: (id: string) => void;
  highlightAnchor?: { anchor: string; nonce: number } | null;
}) {
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [highlightDiff, setHighlightDiff] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(COMPARE_GROUPS.map((g) => [g.id, true])),
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightAnchor) return;
    const [groupId, rowId] = highlightAnchor.anchor.split(":");
    if (!groupId || !rowId) return;
    setOpen((o) => ({ ...o, [groupId]: true }));
    setOnlyDiff(false);
    const id = rowDomId(groupId, rowId);
    setFlash(id);
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const clear = window.setTimeout(() => setFlash(null), 3200);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [highlightAnchor]);

  if (policies.length === 0) {
    return (
      <div
        id="comparison"
        className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        <ListChecks className="h-5 w-5 mx-auto mb-2" />
        勾選保單或使用「一鍵比較此方案」，即可在此顯示詳細保單比較矩陣
      </div>
    );
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?compare=${policies
      .map((p) => p.id)
      .join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("已複製比較連結", { description: url });
    } catch {
      toast.error("複製失敗，請手動複製", { description: url });
    }
  };

  const download = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines: string[] = [];
    lines.push(
      ["比較維度", ...policies.map((p) => `${p.company} ${p.policyName}`)].map(esc).join(","),
    );
    for (const g of COMPARE_GROUPS) {
      lines.push([`【${g.label}】`, ...policies.map(() => "")].map(esc).join(","));
      for (const r of g.rows) {
        if (onlyDiff && rowIsIdentical(r, policies)) continue;
        const vals = policies.map((p) => {
          const v = r.get(p);
          return Array.isArray(v) ? v.join("；") : (v ?? "—");
        });
        lines.push([r.label, ...vals].map(esc).join(","));
      }
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `insurance-comparison-${policies.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("已下載比較表 (CSV)");
  };

  const colWidth = "min-w-[240px]";

  return (
    <div id="comparison" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div>
          <Badge className="bg-teal/15 text-teal border-teal/30 mb-2">Step 3 · 詳細比較矩陣</Badge>
          <h2 className="text-2xl font-bold tracking-tight">保單比較表</h2>
          <p className="text-sm text-muted-foreground mt-1">
            目前比較 {policies.length} 張保單 · 共 7 大類、
            {COMPARE_GROUPS.reduce((s, g) => s + g.rows.length, 0)} 項比較維度
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="only-diff" checked={onlyDiff} onCheckedChange={setOnlyDiff} />
            <Label htmlFor="only-diff" className="text-sm cursor-pointer">
              只看差異
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="hl-diff" checked={highlightDiff} onCheckedChange={setHighlightDiff} />
            <Label htmlFor="hl-diff" className="text-sm cursor-pointer flex items-center gap-1">
              <Highlighter className="h-3.5 w-3.5" />
              差異高亮
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            複製比較連結
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" />
            下載比較表
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-20 bg-muted w-[200px] min-w-[200px] p-3 text-sm font-semibold border-r border-border">
                  比較維度
                </th>
                {policies.map((p) => (
                  <th
                    key={p.id}
                    className={cn("p-3 align-top border-r border-border last:border-r-0", colWidth)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span className="truncate">{p.company}</span>
                          {p.flagged && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  aria-label="社群風評來源"
                                  className="cursor-pointer shrink-0"
                                >
                                  <span className="text-warning">⚠️</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72" side="top">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-warning font-semibold text-sm">
                                    <AlertTriangle className="h-4 w-4" /> 社群風評提示
                                  </div>
                                  <div className="text-xs text-muted-foreground">來源 Source</div>
                                  <div className="text-sm font-medium">{p.flagged.source}</div>
                                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border">
                                    {p.flagged.note}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="text-xs font-normal text-muted-foreground mt-0.5 truncate">
                          {p.policyName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-7 w-7 shrink-0"
                        aria-label={`移除 ${p.company}`}
                        onClick={() => onRemove(p.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {COMPARE_GROUPS.map((g) => {
              const rows = g.rows.filter((r) => !onlyDiff || !rowIsIdentical(r, policies));
              const isOpen = open[g.id] !== false;
              return (
                <tbody key={g.id} className="border-t border-border">
                  <tr>
                    <th
                      colSpan={policies.length + 1}
                      className="p-0 text-left bg-secondary/50 sticky left-0"
                    >
                      <button
                        type="button"
                        onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-primary transition-transform",
                            !isOpen && "-rotate-90",
                          )}
                        />
                        {g.label}
                        <span className="text-xs font-normal text-muted-foreground">
                          {rows.length} 項
                        </span>
                      </button>
                    </th>
                  </tr>
                  {isOpen &&
                    (rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={policies.length + 1}
                          className="px-3 py-3 text-sm text-muted-foreground sticky left-0"
                        >
                          此分類在所選商品間沒有差異
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const differs = policies.length > 1 && !rowIsIdentical(r, policies);
                        const domId = rowDomId(g.id, r.id);
                        const flashing = flash === domId;
                        return (
                          <tr
                            key={r.id}
                            id={domId}
                            className={cn(
                              "border-t border-border/70 scroll-mt-28 transition-colors",
                              highlightDiff && differs && "bg-warning/5",
                              flashing && "ring-2 ring-inset ring-primary bg-primary/10",
                            )}
                          >
                            <td className="sticky left-0 z-10 bg-card w-[200px] min-w-[200px] p-3 align-top border-r border-border">
                              <div className="text-sm font-medium">{r.label}</div>
                              {highlightDiff && differs && (
                                <div className="text-[11px] text-warning mt-1">有差異</div>
                              )}
                            </td>
                            {policies.map((p) => (
                              <td
                                key={p.id}
                                className={cn(
                                  "p-3 align-top border-r border-border last:border-r-0",
                                  colWidth,
                                )}
                              >
                                <Cell row={r} policy={p} />
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>
    </div>
  );
}
