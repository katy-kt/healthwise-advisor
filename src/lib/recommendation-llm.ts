import { askInsuranceLLM } from "@/lib/llm-client";
import type { Answers, Plan, Policy } from "@/data/insurance";
import { DISEASES, planMonthly } from "@/data/insurance";

interface LlmRecommendation {
  summary?: unknown;
  reasoning?: unknown;
  policies?: unknown;
  plans?: unknown;
}

const PAYOUT_STANDARDS = new Set<Policy["payoutStandard"]>([
  "guaranteed",
  "conditional",
  "consult",
]);

function extractJson(text: string): LlmRecommendation {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned) as LlmRecommendation;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) {
      throw new Error("LLM 回應不是有效的 JSON");
    }

    return JSON.parse(cleaned.slice(start, end + 1)) as LlmRecommendation;
  }
}

function validatePolicy(raw: unknown, index: number): Policy {
  if (!raw || typeof raw !== "object") {
    throw new Error(`第 ${index + 1} 筆保單格式錯誤`);
  }

  const policy = raw as Policy;
  const expectedId = `p${index + 1}`;

  if (policy.id !== expectedId) {
    throw new Error(
      `第 ${index + 1} 筆保單 id 必須是 ${expectedId}`,
    );
  }

  if (
    typeof policy.company !== "string" ||
    typeof policy.companyEn !== "string" ||
    typeof policy.category !== "string" ||
    typeof policy.medicalType !== "string" ||
    typeof policy.premium !== "number" ||
    !Number.isFinite(policy.premium) ||
    policy.premium <= 0 ||
    typeof policy.code !== "string" ||
    !Array.isArray(policy.tags) ||
    !policy.tags.every((tag) => typeof tag === "string") ||
    typeof policy.policyName !== "string" ||
    typeof policy.description !== "string" ||
    typeof policy.payoutAmount !== "string" ||
    typeof policy.payoutRatio !== "string" ||
    !PAYOUT_STANDARDS.has(policy.payoutStandard)
  ) {
    throw new Error(`第 ${index + 1} 筆保單資料不完整`);
  }

  return policy;
}

function validatePlans(raw: unknown, policyIds: Set<string>): Plan[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new Error("LLM 必須回傳剛好 3 個 plans");
  }

  const expectedTiers: Plan["tier"][] = [
    "lite",
    "standard",
    "full",
  ];

  return raw.map((rawPlan, index) => {
    if (!rawPlan || typeof rawPlan !== "object") {
      throw new Error(`第 ${index + 1} 個 plan 格式錯誤`);
    }

    const plan = rawPlan as Plan;

    if (plan.tier !== expectedTiers[index]) {
      throw new Error(
        `第 ${index + 1} 個 plan 的 tier 必須是 ${expectedTiers[index]}`,
      );
    }

    if (
      typeof plan.name !== "string" ||
      typeof plan.subtitle !== "string" ||
      !Array.isArray(plan.items)
    ) {
      throw new Error(`第 ${index + 1} 個 plan 資料不完整`);
    }

    if (plan.items.length === 0) {
      throw new Error(`第 ${index + 1} 個 plan 至少要有 1 個 item`);
    }

    for (const item of plan.items) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.policyId !== "string" ||
        !policyIds.has(item.policyId) ||
        (item.level !== "必備" && item.level !== "建議") ||
        typeof item.categoryLabel !== "string" ||
        typeof item.reason !== "string" ||
        typeof item.monthly !== "number" ||
        !Number.isFinite(item.monthly) ||
        item.monthly < 0
      ) {
        throw new Error(
          `第 ${index + 1} 個 plan 的 items 格式錯誤`,
        );
      }
    }

    return plan;
  });
}

export async function generateRecommendations(answers: Answers) {
  const diseaseContext = DISEASES
    .map((disease) => disease.label)
    .join("、");

  const prompt = `你是台灣保險推薦資料整理助手。

請根據使用者問卷，直接產生：
1. 推薦摘要 summary
2. 推薦理由 reasoning
3. 10 筆保單候選 policies
4. 精簡版、標準版、完整版三個推薦方案 plans

問卷：
${JSON.stringify(answers)}

可參考的風險類別：
${diseaseContext}

只輸出有效 JSON。
不要 Markdown。
不要加任何 JSON 前後說明。
不要使用程式碼區塊。

JSON 格式必須符合：

{
  "summary": "繁體中文推薦摘要",
  "reasoning": [
    "繁體中文推薦理由1",
    "繁體中文推薦理由2",
    "繁體中文推薦理由3"
  ],
  "policies": [
    {
      "id": "p1",
      "company": "保險公司",
      "companyEn": "英文公司名",
      "category": "醫療險或重大疾病或意外險",
      "medicalType": "保障類型",
      "premium": 12000,
      "code": "產品代碼",
      "tags": [
        "標籤1",
        "標籤2"
      ],
      "policyName": "保單名稱",
      "description": "簡短保障描述",
      "payoutAmount": "給付額度",
      "payoutRatio": "給付比例",
      "payoutStandard": "consult"
    }
  ],
  "plans": [
    {
      "tier": "lite",
      "name": "精簡版",
      "subtitle": "精簡版方案說明",
      "items": [
        {
          "policyId": "p1",
          "level": "必備",
          "categoryLabel": "保障類型",
          "reason": "為什麼推薦這張保單",
          "monthly": 1000
        }
      ]
    },
    {
      "tier": "standard",
      "name": "標準版",
      "subtitle": "標準版方案說明",
      "items": [
        {
          "policyId": "p2",
          "level": "必備",
          "categoryLabel": "保障類型",
          "reason": "為什麼推薦這張保單",
          "monthly": 1500
        }
      ]
    },
    {
      "tier": "full",
      "name": "完整版",
      "subtitle": "完整版方案說明",
      "items": [
        {
          "policyId": "p3",
          "level": "建議",
          "categoryLabel": "保障類型",
          "reason": "為什麼推薦這張保單",
          "monthly": 2000
        }
      ]
    }
  ]
}

嚴格遵守以下規則：

1. policies 必須剛好 10 筆。
2. policies 的 id 必須依序為 p1、p2、p3、p4、p5、p6、p7、p8、p9、p10。
3. 不可以重複 id。
4. premium 必須是正數，代表年繳保費。
5. tags 必須是字串陣列。
6. payoutStandard 只能是 guaranteed、conditional、consult。
7. 資料不確定時，payoutStandard 使用 consult。
8. 不要捏造保證理賠。
9. plans 必須剛好 3 個。
10. plans 的 tier 必須依序為 lite、standard、full。
11. 每一個 plan 至少要有 1 個 item。
12. plans.items.policyId 只能使用 p1 到 p10。
13. plans.items.level 只能是「必備」或「建議」。
14. plans.items.monthly 必須是數字。
15. plans 的推薦內容必須根據問卷和你產生的 policies 決定。
16. 前端會直接使用你的 JSON，不會重新排序或修改資料，所以請確保資料本身完整且一致。`;

  const rawResponse = await askInsuranceLLM(prompt);
  const response = extractJson(rawResponse);

  if (typeof response.summary !== "string") {
    throw new Error("LLM 回應缺少 summary");
  }

  if (
    !Array.isArray(response.reasoning) ||
    !response.reasoning.every(
      (item) => typeof item === "string",
    )
  ) {
    throw new Error("LLM 回應的 reasoning 格式錯誤");
  }

  if (
    !Array.isArray(response.policies) ||
    response.policies.length !== 10
  ) {
    throw new Error("LLM 必須回傳剛好 10 筆 policies");
  }

  const policies = response.policies.map((policy, index) =>
    validatePolicy(policy, index),
  );

  const policyIds = new Set(
    policies.map((policy) => policy.id),
  );

  if (policyIds.size !== 10) {
    throw new Error("LLM 回傳的 policy id 有重複");
  }

  const plans = validatePlans(
    response.plans,
    policyIds,
  );

  return {
    summary: response.summary,
    reasoning: response.reasoning as string[],
    policies,
    plans,
  };
}

export const recommendationsMonthly = (plans: Plan[]) =>
  plans.map(planMonthly);
