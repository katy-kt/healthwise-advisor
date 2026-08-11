import { useState } from "react";
import { toast } from "sonner";
import { Gender, DiseaseKey, Policy } from "@/types";
import { askInsuranceLLM } from "@/lib/llm-client";
import { DISEASES } from "@/lib/constants";

export function useInsuranceFilters() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState<string>("22");
  const [disease, setDisease] = useState<DiseaseKey>("cancer");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [aiSummary, setAiSummary] = useState("");
  const [aiReasoning, setAiReasoning] = useState<string[]>([]);
  const [displayPolicies, setDisplayPolicies] = useState<Policy[]>([]);

  const diseaseLabel = DISEASES.find((d) => d.value === disease)?.label ?? "";

  const handleGenerate = async (clearSelection: () => void) => {
    setLoading(true);
    setSubmitted(false);
    clearSelection();
    setAiSummary("");
    setAiReasoning([]);
    setDisplayPolicies([]);

    try {
      const prompt = `你是保險推薦顧問。請根據以下使用者資料，輸出 JSON 格式的推薦結果。\n\n使用者資料：\n- 性別：${gender === "male" ? "男性" : "女性"}\n- 年齡：${age}\n- 疾病類別：${diseaseLabel}\n\n請輸出以下格式的 JSON（不要包含任何其他文字）：\n{\n  "summary": "80到120字的推薦摘要",\n  "reasoning": ["理由1", "理由2", "理由3"],\n  "policies": [\n    {\n      "id": "唯一識別碼如p1",\n      "company": "保險公司名稱",\n      "companyEn": "英文名稱",\n      "category": "保單類別如醫療險、重大疾病",\n      "medicalType": "醫療類型如手術險",\n      "premium": 數字保費,\n      "policyName": "保單名稱",\n      "description": "保單描述",\n      "payoutAmount": "理賠額度",\n      "payoutRatio": "理賠比例百分比",\n      "payoutStandard": "guaranteed或conditional或consult"\n    },\n    ... (共10個保單)\n  ]\n}\n\n重要：\n1. 生成10個符合${diseaseLabel}的保單推薦\n2. id須唯一且格式為p1-p10\n3. premium須為數字\n4. payoutStandard只能是guaranteed、conditional或consult其中之一\n5. 必須是有效的JSON格式`;

      const reply = await askInsuranceLLM(prompt);

      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("無法解析 LLM 回應，請確保格式正確");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.summary || !Array.isArray(parsed.reasoning) || !Array.isArray(parsed.policies)) {
        throw new Error("LLM 輸出缺少必要欄位");
      }

      const validPolicies: Policy[] = parsed.policies
        .filter((p: Policy) => {
          return (
            p.id && p.company && p.category && p.medicalType &&
            typeof p.premium === "number" && p.policyName &&
            p.description && p.payoutAmount && p.payoutRatio &&
            ["guaranteed", "conditional", "consult"].includes(p.payoutStandard)
          );
        })
        .slice(0, 10)
        .map((p: Policy, idx: number) => ({
          ...p,
          id: p.id || `p${idx + 1}`,
          companyEn: p.companyEn || p.company,
          payoutStandard: p.payoutStandard as "guaranteed" | "conditional" | "consult",
        }));

      if (validPolicies.length === 0) {
        throw new Error("LLM 生成的保單資料格式不符");
      }

      setAiSummary(parsed.summary);
      setAiReasoning(parsed.reasoning.slice(0, 3));
      setDisplayPolicies(validPolicies);
      setSubmitted(true);
      
      toast.success(`已為您生成 ${validPolicies.length} 張推薦保單`, {
        description: "AI 已根據你的條件提供個性化推薦",
      });
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : "無法生成推薦";
      toast.error("推薦生成失敗", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return {
    gender, setGender, age, setAge, disease, setDisease, diseaseLabel,
    loading, submitted, aiSummary, aiReasoning, displayPolicies, handleGenerate
  };
}