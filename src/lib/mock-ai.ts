/**
 * Mock AI layer for the comparison assistant.
 *
 * This module is intentionally UI-free and side-effect free so that each function
 * can later be swapped for a real LLM / LightRAG call without touching components.
 */
import type { Answers, Policy } from "@/data/insurance";
import { COMPARE_GROUPS, rowIsIdentical } from "@/data/insurance";
import { askInsuranceLLM } from "@/lib/llm-client";
import { jsonrepair } from "jsonrepair";

export type Depth = "simple" | "normal" | "pro";

export interface AssistantContext {
  questionnaireAnswers: Answers;
  selectedPolicies: Policy[];
  comparisonDifferences: ComparisonDifference[];
  conversationPreference: { depth: Depth; focus: string[]; raw?: string };
}

export interface ComparisonDifference {
  groupId: string;
  groupLabel: string;
  rowId: string;
  rowLabel: string;
  values: string[];
}

export interface SuggestedQuestion {
  id: string;
  text: string;
  why: string;
  /** anchor into the comparison table: `${groupId}:${rowId}` */
  anchor?: string;
  anchorLabel?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  anchor?: string;
  anchorLabel?: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** Extracts the rows where the compared products actually differ. */
export function computeDifferences(policies: Policy[]): ComparisonDifference[] {
  if (policies.length < 2) return [];
  const out: ComparisonDifference[] = [];
  for (const g of COMPARE_GROUPS) {
    for (const r of g.rows) {
      if (rowIsIdentical(r, policies)) continue;
      out.push({
        groupId: g.id,
        groupLabel: g.label,
        rowId: r.id,
        rowLabel: r.label,
        values: policies.map((p) => {
          const v = r.get(p);
          return Array.isArray(v) ? v.join("、") : (v ?? "—");
        }),
      });
    }
  }
  return out;
}

export function parsePreference(input: string, current: AssistantContext["conversationPreference"]) {
  const raw = input.trim();
  let depth = current.depth;
  if (/標準|一般|普通|適中|正常|回到標準|恢復標準/.test(raw)) {
    depth = "normal";
  } else if (/簡單|白話|太難|聽不懂|淺/.test(raw)) {
    depth = "simple";
  } else if (/深入|專業|太簡單|條款細節|進階/.test(raw)) {
    depth = "pro";
  }
  const focus: string[] = [];
  if (/理賠|給付/.test(raw)) focus.push("理賠");
  if (/條款/.test(raw)) focus.push("條款");
  if (/保費|價格|預算/.test(raw)) focus.push("保費");
  if (/癌症|重大疾病/.test(raw)) focus.push("癌症");
  if (/續保/.test(raw)) focus.push("續保");
  if (/情境|實際/.test(raw)) focus.push("情境");
  if (/不要.*價格|不要.*保費/.test(raw)) {
    return { depth, focus: focus.filter((f) => f !== "保費"), raw };
  }
  return { depth, focus: focus.length ? focus : current.focus, raw };
}

const softly = (depth: Depth, plain: string, pro: string) => (depth === "pro" ? pro : plain);

const riskText = (a: Answers) => a.risks.join("、") || "尚未指定風險";

/** Picks 3 context-aware suggested questions from the questionnaire + real table differences. */
export function generateSuggestedQuestions(ctx: AssistantContext): SuggestedQuestion[] {
  const { questionnaireAnswers: a, selectedPolicies: ps, comparisonDifferences: diffs } = ctx;
  const { depth, focus } = ctx.conversationPreference;
  const budget = a.budget.toLocaleString();
  const pool: SuggestedQuestion[] = [];

  const diffOf = (rowId: string) => diffs.find((d) => d.rowId === rowId);

  if (!focus.includes("保費") ? focus.length === 0 : true) {
    pool.push({
      id: uid(),
      text: `以我每月 NT$${budget} 的預算，這 ${ps.length} 張保單哪幾張最值得優先留下？`,
      why: `您的月預算為 NT$${budget}，而目前比較的商品年繳保費從 NT$${Math.min(...ps.map((p) => p.premium)).toLocaleString()} 到 NT$${Math.max(...ps.map((p) => p.premium)).toLocaleString()} 有明顯落差，先確認取捨順序比逐條看條款更有幫助。`,
      anchor: "premium:premium",
      anchorLabel: "查看預估保費差異",
    });
  }

  const renewal = diffOf("renewalRule");
  if (renewal) {
    pool.push({
      id: uid(),
      text: `我現在 ${a.age} 歲，這幾張的續保條件哪一張最需要注意？`,
      why: `您目前 ${a.age} 歲，醫療保障可能需要長期持有，而比較表中的「續保規則」在這些商品之間並不一致（${renewal.values.slice(0, 2).join(" vs ")}），這項差異通常比短期保費差距更值得優先確認。`,
      anchor: "conditions:renewalRule",
      anchorLabel: "查看續保規則差異",
    });
  }

  if (a.risks.includes("重大疾病") || focus.includes("癌症")) {
    pool.push({
      id: uid(),
      text: softly(
        depth,
        "我最擔心重大疾病，這幾張在重大疾病上真正差在哪？",
        "我最擔心重大疾病，這幾張在癌症／重大傷病的定義、等待期與給付結構上實際差異為何？",
      ),
      why: `您把「${riskText(a)}」列為主要擔心風險，而目前比較商品中同時存在定額一次金與實支實付兩種給付結構，理賠邏輯完全不同，值得先釐清。`,
      anchor: "claims:payoutMethod",
      anchorLabel: "查看給付方式差異",
    });
  }

  const waiting = diffOf("waitingPeriod");
  if (waiting) {
    pool.push({
      id: uid(),
      text: "等待期不一樣的話，我實際什麼時候才真的有保障？",
      why: `比較表中的「等待期」不一致（${waiting.values.slice(0, 2).join(" vs ")}），這會直接影響您投保後多久才受到保障。`,
      anchor: "conditions:waitingPeriod",
      anchorLabel: "查看等待期差異",
    });
  }

  const receipt = diffOf("receiptType");
  if (receipt) {
    pool.push({
      id: uid(),
      text: "正本／副本理賠差在哪？會影響我以後能不能買第二張嗎？",
      why: `這些商品在「正本 / 副本理賠」上不同（${receipt.values.slice(0, 2).join(" vs ")}），若您未來想搭配雙實支實付，這一項會決定可行性。`,
      anchor: "claims:receiptType",
      anchorLabel: "查看正副本理賠差異",
    });
  }

  if (a.existing.includes("完全沒有") || a.existing.length === 0) {
    pool.push({
      id: uid(),
      text: "我完全沒有保險，這幾張裡面應該先買哪一張？",
      why: `您在問卷中表示目前完全沒有保障，而比較商品中有主約也有必須搭配主約的附約，投保順序會影響能不能成立。`,
      anchor: "premium:requiresMain",
      anchorLabel: "查看主約／附約需求",
    });
  }

  if (focus.includes("情境")) {
    pool.push({
      id: uid(),
      text: "如果我明天住院開刀自費 8 萬，這幾張各會賠多少？",
      why: `您希望看實際情境，而這些商品的給付方式（實支實付 vs 定額）不同，用同一個情境比較最容易看出差別。`,
      anchor: "claims:payoutAmount",
      anchorLabel: "查看給付上限差異",
    });
  }

  const exclusion = diffOf("exclusions");
  if (exclusion && (depth === "pro" || focus.includes("條款"))) {
    pool.push({
      id: uid(),
      text: "這幾張的除外責任有哪些是我可能會踩到的？",
      why: `比較表中「不賠什麼」的內容各家不同，以您 ${a.identity} 的生活型態來看，部分除外項目的踩雷機率並不低。`,
      anchor: "coverage:exclusions",
      anchorLabel: "查看不賠什麼差異",
    });
  }

  return pool.slice(0, 3);
}

function parseSuggestedQuestions(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(jsonrepair(candidate));
      } catch {
        continue;
      }
    }
  }
  throw new Error("LLM 回傳的推薦問題格式錯誤");
}

function validateSuggestedQuestions(raw: unknown, ctx: AssistantContext): SuggestedQuestion[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { questions?: unknown }).questions)) {
    throw new Error("LLM 未回傳 questions 陣列");
  }

  const validAnchors = new Set(ctx.comparisonDifferences.map((d) => `${d.groupId}:${d.rowId}`));
  const questions = (raw as { questions: unknown[] }).questions
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      if (typeof item.text !== "string" || !item.text.trim()) {
        throw new Error(`第 ${index + 1} 個推薦問題缺少 text`);
      }
      if (typeof item.why !== "string" || !item.why.trim()) {
        throw new Error(`第 ${index + 1} 個推薦問題缺少 why`);
      }
      if (/(?:\bp\d+\b|rowId|groupId|anchor|JSON|欄位\s*ID)/i.test(`${item.text} ${item.why}`)) {
        throw new Error(`第 ${index + 1} 個推薦問題包含內部資料格式`);
      }
      const anchor = typeof item.anchor === "string" && item.anchor.trim() ? item.anchor : undefined;
      if (anchor && !validAnchors.has(anchor)) {
        throw new Error(`第 ${index + 1} 個推薦問題的 anchor 無效`);
      }
      return {
        id: uid(),
        text: item.text.trim(),
        why: item.why.trim(),
        ...(anchor ? { anchor, anchorLabel: typeof item.anchorLabel === "string" ? item.anchorLabel : "查看相關差異" } : {}),
      };
    });

  if (questions.length < 3) throw new Error("LLM 回傳的推薦問題不足 3 個");
  return questions.slice(0, 3);
}

export async function generateSuggestedQuestionsWithLLM(ctx: AssistantContext): Promise<SuggestedQuestion[]> {
  const policySummaries = ctx.selectedPolicies.map((policy) => ({
    id: policy.id,
    company: policy.company,
    policyName: policy.policyName,
    category: policy.category,
    medicalType: policy.medicalType,
    premium: policy.premium,
    tags: policy.tags,
  }));
  const allowedAnchors = ctx.comparisonDifferences.map((d) => ({
    anchor: `${d.groupId}:${d.rowId}`,
    group: d.groupLabel,
    row: d.rowLabel,
    values: d.values,
  }));
  const prompt = `你是 HealthWise 的台灣保險比較助手。請根據保單摘要與真實比較差異，生成 3 個使用者最值得先問的個人化問題。

規則：
1. 問題要像真正理解使用者情況後提出的追問，不要照抄固定模板。
2. 優先針對比較表中的實際商品差異，以及這些差異對使用者的影響。
3. 不得捏造資料或做出沒有根據的理賠結論。
4. 每題都要有 why，說明為何對這位使用者重要。
5. anchor 只能從「合法比較差異」中選一個；若問題不需要對應表格，可省略 anchor。
6. 問題與 why 必須使用自然的繁體中文，不得提到任何內部資料格式或技術識別資訊，例如 p1、p2、p3、policy id、rowId、groupId、anchor、JSON 或欄位 ID。
7. 只回傳 JSON，不要 Markdown 或其他文字。

回答偏好：${JSON.stringify(ctx.conversationPreference)}
使用者問卷：${JSON.stringify(ctx.questionnaireAnswers)}
保單摘要：${JSON.stringify(policySummaries)}
合法比較差異：${JSON.stringify(allowedAnchors)}

輸出格式：
{"questions":[{"text":"問題","why":"推薦原因","anchor":"groupId:rowId","anchorLabel":"查看差異"}]}`;

  const response = await askInsuranceLLM(prompt, [], { jsonMode: true, mode: "fast" });
  return validateSuggestedQuestions(parseSuggestedQuestions(response), ctx);
}

/** Regenerates suggestions after the user adjusts the question style. */
export function regenerateQuestions(
  userPreference: string,
  ctx: AssistantContext,
): { questions: SuggestedQuestion[]; preference: AssistantContext["conversationPreference"] } {
  const preference = parsePreference(userPreference, ctx.conversationPreference);
  const questions = generateSuggestedQuestions({ ...ctx, conversationPreference: preference });
  return { questions, preference };
}

/** Mock personalized answer that references the questionnaire and the compared products. */
export function generateMockAIResponse(question: string, ctx: AssistantContext): AssistantMessage {
  const { questionnaireAnswers: a, selectedPolicies: ps, comparisonDifferences: diffs } = ctx;
  const { depth } = ctx.conversationPreference;
  const cheapest = [...ps].sort((x, y) => x.premium - y.premium)[0];
  const priciest = [...ps].sort((x, y) => y.premium - x.premium)[0];
  const monthlyTotal = Math.round(ps.reduce((s, p) => s + p.premium, 0) / 12);
  const topDiffs = diffs.slice(0, 3);

  const head =
    depth === "simple"
      ? `簡單說：以您 ${a.age} 歲、${a.identity}、每月 NT$${a.budget.toLocaleString()} 預算來看，`
      : `根據您的問卷（${a.age} 歲／${a.gender === "male" ? "男" : "女"}／${a.identity}／月預算 NT$${a.budget.toLocaleString()}／擔心「${riskText(a)}」）與目前比較的 ${ps.length} 張商品，`;

  const budgetLine =
    monthlyTotal > a.budget
      ? `目前比較清單換算後約 NT$${monthlyTotal.toLocaleString()} / 月，已超過您的預算上限 NT$${a.budget.toLocaleString()}，建議先保留「${cheapest?.policyName ?? ""}」這類低保費且覆蓋主要風險的商品。`
      : `目前比較清單換算後約 NT$${monthlyTotal.toLocaleString()} / 月，仍在您 NT$${a.budget.toLocaleString()} 的預算內。`;

  const diffLines = topDiffs.length
    ? topDiffs
        .map(
          (d, i) =>
            `${i + 1}. ${d.groupLabel} → ${d.rowLabel}：${ps
              .map((p, idx) => `${p.company}「${d.values[idx]}」`)
              .slice(0, 3)
              .join("；")}`,
        )
        .join("\n")
    : "目前比較的商品在主要欄位上差異不大，可以直接用保費與續保穩定性做決定。";

  const tail =
    depth === "pro"
      ? `\n\n進一步建議：先確認條款中的給付定義與除外責任，再看等待期與續保條款；若要規劃雙實支實付，請優先保留可接受副本理賠者（${ps.filter((p) => (p.receiptType ?? "").includes("副本")).map((p) => p.company).join("、") || "本次清單皆需確認"}）。`
      : `\n\n小結：先看「保障有沒有補到你最怕的風險」，再看保費；便宜不代表不適合，但續保不穩定的商品長期風險較高。`;

  const anchor = topDiffs[0]
    ? { anchor: `${topDiffs[0].groupId}:${topDiffs[0].rowId}`, anchorLabel: `查看${topDiffs[0].rowLabel}差異` }
    : {};

  return {
    id: uid(),
    role: "assistant",
    content: `${head}我針對「${question}」的分析如下：\n\n${budgetLine}\n\n主要差異：\n${diffLines}\n\n保費區間：${cheapest ? `${cheapest.company} NT$${cheapest.premium.toLocaleString()}/年（最低）` : ""}${priciest && priciest !== cheapest ? `、${priciest.company} NT$${priciest.premium.toLocaleString()}/年（最高）` : ""}${tail}`,
    ...anchor,
  };
}

export const makeUserMessage = (text: string): AssistantMessage => ({
  id: uid(),
  role: "user",
  content: text,
});

export const makeSystemMessage = (text: string): AssistantMessage => ({
  id: uid(),
  role: "system",
  content: text,
});
