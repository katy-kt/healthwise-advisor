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

    return JSON.parse(
      cleaned.slice(start, end + 1),
    ) as LlmRecommendation;
  }
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTextList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0,
    )
  );
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
    !isText(policy.company) ||
    !isText(policy.companyEn) ||
    !isText(policy.policyName) ||
    !isText(policy.code) ||
    !isText(policy.category) ||
    !isText(policy.medicalType) ||
    !isText(policy.description)
  ) {
    throw new Error(
      `第 ${index + 1} 筆保單基本資訊不完整`,
    );
  }

  if (
    typeof policy.premium !== "number" ||
    !Number.isFinite(policy.premium) ||
    policy.premium <= 0
  ) {
    throw new Error(
      `第 ${index + 1} 筆保單 premium 必須是正數`,
    );
  }

  if (
    !isTextList(policy.tags) ||
    !isTextList(policy.covers) ||
    !isTextList(policy.payoutItems) ||
    !isTextList(policy.exclusions) ||
    !isTextList(policy.attentionPoints) ||
    !isTextList(policy.pros) ||
    !isTextList(policy.cons)
  ) {
    throw new Error(
      `第 ${index + 1} 筆保單的比較表陣列欄位不完整`,
    );
  }

  if (
    !isText(policy.status) ||
    !isText(policy.approvalNumber) ||
    !isText(policy.premiumRange) ||
    !isText(policy.paymentPeriod) ||
    !isText(policy.coveragePeriod) ||
    !isText(policy.mainOrRider) ||
    !isText(policy.requiresMainPolicy) ||
    !isText(policy.policyType) ||
    !isText(policy.plainSummary) ||
    !isText(policy.claimRequirements) ||
    !isText(policy.entryAge) ||
    !isText(policy.waitingPeriod) ||
    !isText(policy.coolingOffPeriod) ||
    !isText(policy.renewalRule) ||
    !isText(policy.maxRenewalAge) ||
    !isText(policy.occupationRestrictions) ||
    !isText(policy.healthRestrictions) ||
    !isText(policy.payoutAmount) ||
    !isText(policy.payoutLimit) ||
    !isText(policy.payoutRatio) ||
    !isText(policy.payoutMethod) ||
    !isText(policy.isReimbursement) ||
    !isText(policy.receiptType) ||
    !isText(policy.surgeryBenefit) ||
    !isText(policy.hospitalBenefit) ||
    !isText(policy.outpatientBenefit) ||
    !isText(policy.otherPayoutConditions) ||
    !isText(policy.suitableFor) ||
    !isText(policy.notSuitableFor) ||
    !isText(policy.policyDocumentUrl) ||
    !isText(policy.productDocumentUrl) ||
    !isText(policy.officialProductUrl) ||
    !isText(policy.dataSource) ||
    !isText(policy.lastUpdated)
  ) {
    throw new Error(
      `第 ${index + 1} 筆保單的詳細比較資料不完整`,
    );
  }

  if (!PAYOUT_STANDARDS.has(policy.payoutStandard)) {
    throw new Error(
      `第 ${index + 1} 筆保單 payoutStandard 格式錯誤`,
    );
  }

  return policy;
}

function validatePlans(
  raw: unknown,
  policyIds: Set<string>,
): Plan[] {
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
      throw new Error(
        `第 ${index + 1} 個 plan 格式錯誤`,
      );
    }

    const plan = rawPlan as Plan;

    if (plan.tier !== expectedTiers[index]) {
      throw new Error(
        `第 ${index + 1} 個 plan 的 tier 必須是 ${expectedTiers[index]}`,
      );
    }

    if (
      !isText(plan.name) ||
      !isText(plan.subtitle) ||
      !Array.isArray(plan.items) ||
      plan.items.length === 0
    ) {
      throw new Error(
        `第 ${index + 1} 個 plan 資料不完整`,
      );
    }

    for (const item of plan.items) {
      if (
        !item ||
        typeof item !== "object" ||
        !isText(item.policyId) ||
        !policyIds.has(item.policyId) ||
        (item.level !== "必備" &&
          item.level !== "建議") ||
        !isText(item.categoryLabel) ||
        !isText(item.reason) ||
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

export async function generateRecommendations(
  answers: Answers,
) {
  const diseaseContext = DISEASES
    .map((disease) => disease.label)
    .join("、");

  const prompt = `你是 HealthWise 的台灣保險推薦與商品比較資料分析助手。

你的任務是根據使用者問卷，產生可以直接交給前端顯示的完整推薦資料。

【最重要原則】

你的首要任務不是把欄位填滿，而是避免產生錯誤資訊。

任何無法確認的資料，直接輸出 X。

寧願顯示 X，也不可以自行猜測、補寫或捏造保單資料。

前端不會：
- 使用 MOCK 資料補值
- 修改你的資料
- 重新排序你的 policies
- 自己產生比較表內容
- 自己重新決定推薦方案

所以你輸出的 JSON 就是前端最後實際使用的資料。

────────────────
【使用者問卷】
────────────────

${JSON.stringify(answers)}

可參考的風險類別：

${diseaseContext}

────────────────
【你必須產生的資料】
────────────────

1. summary
整體推薦摘要。

2. reasoning
3 個根據問卷產生的推薦理由。

3. policies
剛好 10 筆候選保單。

4. plans
精簡版 lite、
標準版 standard、
完整版 full。

5. 每一筆 policy 都必須包含完整比較表資料。

────────────────
【比較表共有 7 大類】
────────────────

一、基本資訊
- 保險公司
- 商品名稱
- 商品代碼
- 險種
- 商品狀態
- 核准 / 核備 / 備查文號

二、保費與繳費
- 預估保費
- 保費範圍
- 繳費年期
- 保障期間
- 主約 / 附約
- 是否需要搭配主約

三、先看懂保障
- 保什麼
- 賠什麼
- 不賠什麼
- 條款類型
- 先注意
- 白話摘要
- 怎麼才會賠

四、投保條件
- 投保年齡
- 等待期
- 猶豫期
- 續保規則
- 最高續保年齡
- 職業限制
- 健康告知 / 投保限制

五、理賠與給付
- 理賠標準
- 理賠金額 / 給付上限
- 賠償比例
- 給付方式
- 是否實支實付
- 正本 / 副本理賠
- 手術給付
- 住院給付
- 門診給付
- 其他重要給付條件

六、白話評價
- 優點
- 缺點
- 適合對象
- 可能不適合對象

七、文件與來源
- 保單條款
- 商品文件
- 官方商品頁
- 資料來源
- 最後更新時間

────────────────
【輸出 JSON 格式】
────────────────

只輸出有效 JSON。

不要輸出 Markdown。
不要使用程式碼區塊。
不要在 JSON 前後輸出任何文字。

格式：

{
  "summary": "根據問卷產生的繁體中文推薦摘要",

  "reasoning": [
    "推薦理由 1",
    "推薦理由 2",
    "推薦理由 3"
  ],

  "policies": [
    {
      "id": "p1",

      "company": "保險公司中文名稱",
      "companyEn": "保險公司英文名稱",

      "policyName": "商品名稱",
      "code": "商品代碼",

      "category": "險種",
      "medicalType": "保障類型",

      "description": "商品簡介",

      "status": "商品狀態或 X",
      "approvalNumber": "核准核備備查文號或 X",

      "premium": 12000,
      "premiumRange": "保費範圍或 X",

      "paymentPeriod": "繳費年期或 X",
      "coveragePeriod": "保障期間或 X",

      "mainOrRider": "主約或附約或 X",
      "requiresMainPolicy": "是否需要搭配主約或 X",

      "tags": [
        "特色標籤"
      ],

      "covers": [
        "主要保障內容"
      ],

      "payoutItems": [
        "主要給付項目"
      ],

      "exclusions": [
        "主要不保或除外責任"
      ],

      "policyType": "條款類型或 X",

      "attentionPoints": [
        "注意事項"
      ],

      "plainSummary": "白話說明這張保單",

      "claimRequirements": "主要給付條件或 X",

      "entryAge": "投保年齡或 X",
      "waitingPeriod": "等待期或 X",
      "coolingOffPeriod": "猶豫期或 X",

      "renewalRule": "續保規則或 X",
      "maxRenewalAge": "最高續保年齡或 X",

      "occupationRestrictions": "職業限制或 X",
      "healthRestrictions": "健康告知或投保限制或 X",

      "payoutStandard": "consult",

      "payoutAmount": "主要給付金額或 X",
      "payoutLimit": "給付上限或 X",
      "payoutRatio": "給付比例或 X",

      "payoutMethod": "給付方式或 X",

      "isReimbursement": "是否實支實付或 X",
      "receiptType": "正本副本理賠規則或 X",

      "surgeryBenefit": "手術給付或 X",
      "hospitalBenefit": "住院給付或 X",
      "outpatientBenefit": "門診給付或 X",

      "otherPayoutConditions": "其他重要給付條件或 X",

      "pros": [
        "相較其他候選商品的優點"
      ],

      "cons": [
        "相較其他候選商品的限制或缺點"
      ],

      "suitableFor": "適合對象或 X",

      "notSuitableFor": "可能不適合對象或 X",

      "policyDocumentUrl": "可靠網址或 X",
      "productDocumentUrl": "可靠網址或 X",
      "officialProductUrl": "可靠網址或 X",

      "dataSource": "資料來源或 X",
      "lastUpdated": "資料更新日期或 X"
    }
  ],

  "plans": [
    {
      "tier": "lite",
      "name": "精簡版",
      "subtitle": "根據問卷產生的方案說明",
      "items": [
        {
          "policyId": "p1",
          "level": "必備",
          "categoryLabel": "保障類型",
          "reason": "使用者需求與商品特性之間的推薦原因",
          "monthly": 1000
        }
      ]
    },

    {
      "tier": "standard",
      "name": "標準版",
      "subtitle": "根據問卷產生的方案說明",
      "items": [
        {
          "policyId": "p2",
          "level": "必備",
          "categoryLabel": "保障類型",
          "reason": "推薦原因",
          "monthly": 1500
        }
      ]
    },

    {
      "tier": "full",
      "name": "完整版",
      "subtitle": "根據問卷產生的方案說明",
      "items": [
        {
          "policyId": "p3",
          "level": "建議",
          "categoryLabel": "保障類型",
          "reason": "推薦原因",
          "monthly": 2000
        }
      ]
    }
  ]
}

────────────────
【不知道資料時的規則】
────────────────

文字欄位如果沒有可靠資料：

填：
"X"

例如：

"waitingPeriod": "X"

"renewalRule": "X"

"approvalNumber": "X"

"claimRequirements": "X"

禁止自己猜答案。

陣列欄位如果沒有可靠資料：

填：
["X"]

例如：

"exclusions": ["X"]

"attentionPoints": ["X"]

"pros": ["X"]

"cons": ["X"]

禁止用一般保險常識補資料。

────────────────
【禁止捏造】
────────────────

禁止因為欄位需要內容而自行推測。

禁止：

- 根據商品名稱猜條款
- 根據險種猜等待期
- 根據其他商品猜這張商品
- 根據同一家公司的其他商品猜資料
- 自行製造商品代碼
- 自行製造核准文號
- 自行製造官方網址
- 自行製造等待期
- 自行製造續保年齡
- 自行製造理賠金額
- 自行製造理賠比例

如果無法確認：

直接 X。

────────────────
【X 的意思】
────────────────

X 只代表：

「目前資料不足，無法確認。」

X 不代表：

- 沒有保障
- 不理賠
- 沒有等待期
- 沒有限制
- 沒有這項條款

例如：

"waitingPeriod": "X"

代表等待期目前無法確認。

不是代表沒有等待期。

────────────────
【payoutStandard 特殊規則】
────────────────

payoutStandard 不可以填 X。

只能使用：

"guaranteed"
"conditional"
"consult"

如果資料不足：

一律使用：
"consult"

只有資料明確支持時，
才可以使用 guaranteed 或 conditional。

────────────────
【premium 與 monthly 特殊規則】
────────────────

premium 必須是 number，
而且必須大於 0。

premium 不可以填 X。

如果無法合理確認 premium，
不要為了湊滿資料而任意猜價格。

monthly 必須是 number。

plans.items.monthly 必須與該商品 premium
以及方案內容保持合理一致。

────────────────
【推薦邏輯】
────────────────

推薦時必須考量問卷中的：

- 年齡
- 身分
- 收入
- 擔心的風險
- 房貸
- 扶養責任
- 已有保障
- 預算
- 偏好
- 資訊說明方式

不要只因為保費便宜就推薦。

如果使用者已經有某類保障，
不要沒有理由地重複推薦相同保障。

plans.items.reason 必須明確說明：

「使用者哪一項需求」

加上

「這張商品哪一項特性」

所以才推薦。

不要只寫：

「保障完整」

「CP 值高」

「適合使用者」

這種空泛理由。

────────────────
【比較表規則】
────────────────

每一張 policy 都必須獨立支撐完整比較表。

不同商品應該呈現真正有意義的差異。

不要把所有商品的：

waitingPeriod

renewalRule

payoutLimit

payoutMethod

pros

cons

suitableFor

claimRequirements

全部寫成相同內容。

如果不知道差異：

填 X。

不要自己製造差異。

pros 與 cons 必須描述相對於這次其他候選商品的差異。

plainSummary 必須使用一般消費者容易理解的繁體中文。

────────────────
【JSON 一致性規則】
────────────────

1. policies 必須剛好 10 筆。

2. id 必須依序為：

p1
p2
p3
p4
p5
p6
p7
p8
p9
p10

3. id 不可以重複。

4. premium 必須是大於 0 的 number。

5. 以下欄位必須是字串陣列：

tags
covers
payoutItems
exclusions
attentionPoints
pros
cons

6. 資料不知道時，這些陣列填 ["X"]。

7. plans 必須剛好 3 個。

8. plans tier 必須依序：

lite
standard
full

9. 每個 plan 至少有 1 個 item。

10. policyId 只能引用本次 policies 裡的 id。

11. level 只能是：

"必備"

或

"建議"

12. monthly 必須是 number。

13. 同一張 policy 的資料必須前後一致。

14. plans 的推薦原因必須與 policies 的資料一致。

15. 不得假設前端會替你補值或修改資料。`;

  const rawResponse =
    await askInsuranceLLM(prompt);

  const response =
    extractJson(rawResponse);

  if (!isText(response.summary)) {
    throw new Error("LLM 回應缺少 summary");
  }

  if (
    !Array.isArray(response.reasoning) ||
    response.reasoning.length !== 3 ||
    !response.reasoning.every(isText)
  ) {
    throw new Error(
      "LLM reasoning 必須剛好有 3 筆",
    );
  }

  if (
    !Array.isArray(response.policies) ||
    response.policies.length !== 10
  ) {
    throw new Error(
      "LLM 必須回傳剛好 10 筆 policies",
    );
  }

  const policies =
    response.policies.map(
      (policy, index) =>
        validatePolicy(policy, index),
    );

  const policyIds = new Set(
    policies.map((policy) => policy.id),
  );

  if (policyIds.size !== 10) {
    throw new Error(
      "LLM 回傳的 policy id 有重複",
    );
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

export const recommendationsMonthly = (
  plans: Plan[],
) => plans.map(planMonthly);
