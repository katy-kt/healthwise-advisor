import { askInsuranceLLM } from "@/lib/llm-client";
import type { Answers, Plan, PlanItem, Policy } from "@/data/insurance";
import { DISEASES, MOCK_POLICIES, planMonthly } from "@/data/insurance";

interface LlmPolicy {
  id?: unknown;
  company?: unknown;
  companyEn?: unknown;
  category?: unknown;
  medicalType?: unknown;
  premium?: unknown;
  code?: unknown;
  tags?: unknown;
  policyName?: unknown;
  description?: unknown;
  payoutAmount?: unknown;
  payoutRatio?: unknown;
  payoutStandard?: unknown;
  [key: string]: unknown;
}

interface LlmRecommendation {
  summary?: unknown;
  reasoning?: unknown;
  policies?: unknown;
}

const PAYOUT_STANDARDS = new Set<Policy["payoutStandard"]>([
  "guaranteed",
  "conditional",
  "consult",
]);

function asText(value: unknown, fallback = "資料待確認") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asTextList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function asPositiveNumber(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function extractJson(text: string): LlmRecommendation {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as LlmRecommendation;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("LLM 回應不是有效的 JSON");
    return JSON.parse(cleaned.slice(start, end + 1)) as LlmRecommendation;
  }
}

function normalizePolicy(raw: LlmPolicy, index: number): Policy | null {
  const fallback = MOCK_POLICIES[index];
  if (!raw || typeof raw !== "object") return null;

  const id = `p${index + 1}`;
  const premium = asPositiveNumber(raw.premium, fallback?.premium ?? 0);
  const payoutStandard = PAYOUT_STANDARDS.has(raw.payoutStandard as Policy["payoutStandard"])
    ? (raw.payoutStandard as Policy["payoutStandard"])
    : "consult";

  if (!premium || !asText(raw.company, fallback?.company)) return null;

  return {
    ...fallback,
    ...raw,
    id,
    company: asText(raw.company, fallback?.company ?? "保險公司待確認"),
    companyEn: asText(raw.companyEn, fallback?.companyEn ?? "Insurance Provider"),
    category: asText(raw.category, fallback?.category ?? "醫療險"),
    medicalType: asText(raw.medicalType, fallback?.medicalType ?? "醫療保障"),
    premium,
    code: asText(raw.code, fallback?.code ?? `LLM-${id.toUpperCase()}`),
    tags: asTextList(raw.tags, fallback?.tags ?? []),
    policyName: asText(raw.policyName, fallback?.policyName ?? `個人化推薦方案 ${index + 1}`),
    description: asText(raw.description, fallback?.description ?? "保障內容請以正式保單條款為準。"),
    payoutAmount: asText(raw.payoutAmount, fallback?.payoutAmount ?? "依條款約定"),
    payoutRatio: asText(raw.payoutRatio, fallback?.payoutRatio ?? "依條款約定"),
    payoutStandard,
  };
}

function makePlans(policies: Policy[], answers: Answers): Plan[] {
  const sorted = [...policies].sort((a, b) => a.premium - b.premium);
  const riskMatches = (policy: Policy) => {
    const text = `${policy.category} ${policy.medicalType} ${policy.tags.join(" ")}`;
    return answers.risks.some((risk) => text.includes(risk.replace("花費", "")));
  };

  return [
    { tier: "lite", name: "精簡版", subtitle: "優先補足主要風險，以較低保費建立基本保障。", ratio: 0.55 },
    { tier: "standard", name: "標準版", subtitle: "在預算內平衡保障範圍與保費。", ratio: 0.8 },
    { tier: "full", name: "完整版", subtitle: "盡可能完整覆蓋問卷中最重要的風險。", ratio: 0.98 },
  ].map((tier) => {
    const cap = Math.max(sorted[0]?.premium ?? 0, Math.floor(answers.budget * tier.ratio * 12));
    const candidates = [...sorted].sort((a, b) => Number(riskMatches(b)) - Number(riskMatches(a)) || a.premium - b.premium);
    const selected: Policy[] = [];
    let annualTotal = 0;
    for (const policy of candidates) {
      if (selected.length >= 5 || annualTotal + policy.premium > cap) continue;
      selected.push(policy);
      annualTotal += policy.premium;
    }
    if (selected.length === 0 && candidates[0]) selected.push(candidates[0]);

    const items: PlanItem[] = selected.map((policy, index) => ({
      policyId: policy.id,
      level: index < Math.max(1, Math.ceil(selected.length * 0.7)) ? "必備" : "建議",
      categoryLabel: policy.category,
      reason: `${riskMatches(policy) ? "符合您勾選的主要風險" : "補足整體保障缺口"}；實際給付與除外責任請以正式條款為準。`,
      monthly: Math.round(policy.premium / 12),
    }));

    return { tier: tier.tier as Plan["tier"], name: tier.name, subtitle: tier.subtitle, items };
  });
}

export async function generateRecommendations(answers: Answers) {
  const diseaseContext = DISEASES.map((disease) => disease.label).join("、");
  const prompt = `你是台灣保險推薦資料整理助手。請根據問卷產生 10 筆可供前端比較表使用的保單候選資料。

問卷：${JSON.stringify(answers)}
可參考的風險類別：${diseaseContext}

只輸出有效 JSON，不要 Markdown、不要前後說明，格式必須完全符合：
{
  "summary": "繁體中文推薦摘要",
  "reasoning": ["繁體中文理由1", "理由2", "理由3"],
  "policies": [
    {
      "company": "保險公司",
      "companyEn": "英文公司名",
      "category": "醫療險或重大疾病或意外險",
      "medicalType": "保障類型",
      "premium": 12000,
      "code": "產品代碼",
      "tags": ["標籤1", "標籤2"],
      "policyName": "保單名稱",
      "description": "簡短保障描述",
      "payoutAmount": "給付額度",
      "payoutRatio": "給付比例",
      "payoutStandard": "guaranteed"
    }
  ]
}

規則：policies 必須剛好 10 筆；premium 是正數且代表年繳保費；payoutStandard 只能是 guaranteed、conditional、consult；不要捏造保證理賠，資料不確定時使用 consult。`;

  const response = extractJson(await askInsuranceLLM(prompt));
  if (!Array.isArray(response.policies)) throw new Error("LLM 回應缺少 policies 陣列");

  const policies = response.policies
    .slice(0, 10)
    .map((policy, index) => normalizePolicy(policy as LlmPolicy, index))
    .filter((policy): policy is Policy => policy !== null);

  if (policies.length < 3) throw new Error("LLM 產生的保單資料不足，無法建立比較表");

  return {
    summary: asText(response.summary, "已根據您的問卷整理個人化保險候選方案。"),
    reasoning: asTextList(response.reasoning).slice(0, 3),
    policies,
    plans: makePlans(policies, answers),
  };
}

export const recommendationsMonthly = (plans: Plan[]) => plans.map(planMonthly);
