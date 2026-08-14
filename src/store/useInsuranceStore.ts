import { create } from "zustand";
import { toast } from "sonner";
import { Gender, DiseaseKey, Policy } from "@/types";
import { DISEASES } from "@/lib/constants";
import { askInsuranceLLM } from "@/lib/llm-client";

interface InsuranceState {
  // 1. 表單狀態
  gender: Gender;
  age: string;
  disease: DiseaseKey;
  
  // 2. 請求狀態
  loading: boolean;
  submitted: boolean;
  
  // 3. 推薦結果
  aiSummary: string;
  aiReasoning: string[];
  displayPolicies: Policy[];
  
  // 4. 對比狀態
  selectedPolicyIds: string[];

  // Actions (狀態更新函數)
  setGender: (gender: Gender) => void;
  setAge: (age: string) => void;
  setDisease: (disease: DiseaseKey) => void;
  togglePolicySelection: (id: string, checked: boolean) => void;
  selectPolicies: (ids: string[]) => void;
  clearSelection: () => void;
  generateRecommendations: () => Promise<void>;
}

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  // 初始狀態
  gender: "male",
  age: "22",
  disease: "cancer",
  loading: false,
  submitted: false,
  aiSummary: "",
  aiReasoning: [],
  displayPolicies: [],
  selectedPolicyIds: [],

  // 更新基本資料
  setGender: (gender) => set({ gender }),
  setAge: (age) => set({ age }),
  setDisease: (disease) => set({ disease }),

  // 保單選擇邏輯
  togglePolicySelection: (id, checked) => {
    const { selectedPolicyIds } = get();
    if (checked) {
      if (selectedPolicyIds.length >= 8) {
        toast.warning("最多只能選擇 8 張保單進行比較", {
          description: "Maximum 8 policies can be compared",
        });
        return;
      }
      set({ selectedPolicyIds: [...selectedPolicyIds, id] });
    } else {
      set({ selectedPolicyIds: selectedPolicyIds.filter((x) => x !== id) });
    }
  },

  selectPolicies: (ids) => set({ selectedPolicyIds: [...new Set(ids)].slice(0, 8) }),

  clearSelection: () => set({ selectedPolicyIds: [] }),

  // LLM 生成邏輯 (完全封裝)
  generateRecommendations: async () => {
    const { gender, age, disease } = get();
    const diseaseLabel = DISEASES.find((d) => d.value === disease)?.label ?? "";
    
    // 重置狀態並開始 Loading
    set({
      loading: true,
      submitted: false,
      selectedPolicyIds: [],
      aiSummary: "",
      aiReasoning: [],
      displayPolicies: []
    });

    try {
      const prompt = `你是保險推薦顧問。請根據以下使用者資料，輸出 JSON 格式的推薦結果。\n\n使用者資料：\n- 性別：${gender === "male" ? "男性" : "女性"}\n- 年齡：${age}\n- 疾病類別：${diseaseLabel}\n\n請輸出以下格式的 JSON（不要包含任何其他文字）：\n{\n  "summary": "80到120字的推薦摘要",\n  "reasoning": ["理由1", "理由2", "理由3"],\n  "policies": [\n    {\n      "id": "唯一識別碼如p1",\n      "company": "保險公司名稱",\n      "companyEn": "英文名稱",\n      "category": "保單類別如醫療險、重大疾病",\n      "medicalType": "醫療類型如手術險",\n      "premium": 數字保費,\n      "policyName": "保單名稱",\n      "description": "保單描述",\n      "payoutAmount": "理賠額度",\n      "payoutRatio": "理賠比例百分比",\n      "payoutStandard": "guaranteed或conditional或consult"\n    },\n    ... (共10個保單)\n  ]\n}\n\n重要：\n1. 生成10個符合${diseaseLabel}的保單推薦\n2. id須唯一且格式為p1-p10\n3. premium須為數字\n4. payoutStandard只能是guaranteed、conditional或consult其中之一\n5. 必須是有效的JSON格式`;

      const reply = await askInsuranceLLM(prompt);

      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("無法解析 LLM 回應，請確保格式正確");

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

      if (validPolicies.length === 0) throw new Error("LLM 生成的保單資料格式不符");

      // 成功後更新狀態
      set({
        aiSummary: parsed.summary,
        aiReasoning: parsed.reasoning.slice(0, 3),
        displayPolicies: validPolicies,
        submitted: true
      });
      
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
      set({ loading: false });
    }
  }
}));
