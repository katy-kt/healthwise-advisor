import { useMemo } from "react";
import { useInsuranceStore } from "@/store/useInsuranceStore";

export function useMatchingScore() {
  const age = useInsuranceStore((state) => state.age);
  const gender = useInsuranceStore((state) => state.gender);
  const disease = useInsuranceStore((state) => state.disease);

  return useMemo(() => {
    const a = parseInt(age || "0", 10);
    let base = 68;
    if (disease === "cancer") base += a < 30 ? 6 : a < 50 ? 14 : 20;
    if (disease === "cardio") base += a < 40 ? 4 : 18;
    if (disease === "accident") base += a < 30 ? 22 : 10;
    if (disease === "surgery") base += 12;
    if (gender === "female" && disease === "cancer") base += 4;
    return Math.min(97, base);
  }, [age, gender, disease]);
}