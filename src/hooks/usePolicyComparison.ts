import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Policy } from "@/types";
import { MOCK_POLICIES } from "@/lib/constants";

export function usePolicyComparison(displayPolicies: Policy[]) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      if (selected.length >= 3) {
        toast.warning("最多只能選擇 3 張保單進行比較", {
          description: "Maximum 3 policies can be compared",
        });
        return;
      }
      setSelected((s) => [...s, id]);
    } else {
      setSelected((s) => s.filter((x) => x !== id));
    }
  };

  const clearSelection = () => setSelected([]);

  const selectedPolicies = useMemo(
    () =>
      (displayPolicies.length > 0 ? displayPolicies : MOCK_POLICIES).filter((p) =>
        selected.includes(p.id)
      ),
    [selected, displayPolicies]
  );

  return { selected, toggleSelect, clearSelection, selectedPolicies };
}