import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Heart,
  HelpCircle,
  Stethoscope,
  XCircle,
} from "lucide-react";

export type Gender = "male" | "female";
export type DiseaseKey = "cancer" | "cardio" | "accident" | "surgery";

export interface Policy {
  id: string;
  company: string;
  companyEn: string;
  category: string;
  medicalType: string;
  premium: number;
  code: string;
  tags: string[];
  policyName: string;
  description: string;
  payoutAmount: string;
  payoutRatio: string;
  payoutStandard: "guaranteed" | "conditional" | "consult";
  flagged?: { source: string; note: string };
}

export const MAX_COMPARE = 8;

export const DISEASES: { value: DiseaseKey; label: string; icon: typeof Heart }[] = [
  { value: "cancer", label: "癌症 Cancer", icon: Activity },
  { value: "cardio", label: "心血管疾病 Cardiovascular", icon: Heart },
  { value: "accident", label: "意外 Accident", icon: AlertTriangle },
  { value: "surgery", label: "手術 Surgery", icon: Stethoscope },
];

export const MOCK_POLICIES: Policy[] = [
  {
    id: "p1",
    company: "國泰人壽",
    companyEn: "Cathay Life",
    category: "醫療險",
    medicalType: "手術險 Surgery",
    premium: 12800,
    code: "CTH-M180A",
    tags: ["住院醫療", "手術費用", "醫療雜費", "門診手術"],
    policyName: "康健守護實支實付終身醫療A型",
    description:
      "涵蓋住院日額、手術費用實支實付，含門診手術、雜費上限每次NT$180,000，保證續保至85歲。",
    payoutAmount: "NT$ 180,000 / 次",
    payoutRatio: "100%",
    payoutStandard: "guaranteed",
  },
  {
    id: "p2",
    company: "南山人壽",
    companyEn: "Nan Shan Life",
    category: "重大疾病",
    medicalType: "癌症險 Cancer",
    premium: 18500,
    code: "NSL-CA100",
    tags: ["初次罹癌一次金", "化療放療", "標靶藥物", "癌症門診"],
    policyName: "新一代抗癌鬥士終身癌症保險",
    description:
      "初次罹癌一次金NT$1,000,000，化療放療每次給付，含標靶藥物與癌症門診手術。",
    payoutAmount: "NT$ 1,000,000",
    payoutRatio: "100%",
    payoutStandard: "guaranteed",
    flagged: {
      source: "Dcard 保險版 2024/06 討論串",
      note: "多名用戶反映理賠審核期較長，部分標靶藥物需附加證明。",
    },
  },
  {
    id: "p3",
    company: "富邦人壽",
    companyEn: "Fubon Life",
    category: "意外險",
    medicalType: "意外險 Accident",
    premium: 4200,
    code: "FBL-ACC300",
    tags: ["意外身故", "意外醫療實支", "交通事故加倍", "失能給付"],
    policyName: "全方位意外傷害保險 Plus",
    description:
      "意外身故最高NT$3,000,000，意外醫療實支實付上限NT$60,000，含交通事故加倍給付。",
    payoutAmount: "NT$ 60,000 / 次",
    payoutRatio: "90%",
    payoutStandard: "conditional",
  },
  {
    id: "p4",
    company: "新光人壽",
    companyEn: "Shin Kong Life",
    category: "醫療險",
    medicalType: "住院醫療 Hospitalization",
    premium: 9800,
    code: "SKL-H3000",
    tags: ["住院日額", "加護病房加倍", "門診手術", "保證續保"],
    policyName: "安心醫定保住院日額醫療",
    description: "住院日額NT$3,000，加護病房加倍，含門診手術，保證續保至75歲。",
    payoutAmount: "NT$ 3,000 / 日",
    payoutRatio: "80%",
    payoutStandard: "conditional",
  },
  {
    id: "p5",
    company: "遠雄人壽",
    companyEn: "Yuanta Life",
    category: "重大疾病",
    medicalType: "心血管險 Cardio",
    premium: 15200,
    code: "YTL-CV800",
    tags: ["重大傷病一次金", "心導管手術", "支架植入", "術後照護"],
    policyName: "護心心血管重大傷病保障",
    description:
      "涵蓋7項心血管重大傷病一次金NT$800,000，含心導管手術與支架植入。",
    payoutAmount: "NT$ 800,000",
    payoutRatio: "100%",
    payoutStandard: "guaranteed",
    flagged: {
      source: "PTT insurance 版 2023 熱門文",
      note: "早期版本條款對「心血管重大傷病」定義較嚴格，需諮詢最新版本。",
    },
  },
  {
    id: "p6",
    company: "中國人壽",
    companyEn: "China Life",
    category: "醫療險",
    medicalType: "實支實付 Reimbursement",
    premium: 11600,
    code: "CLI-D200",
    tags: ["雜費實支", "手術費用", "副本理賠", "三擇一給付"],
    policyName: "雙實付優選醫療終身保險",
    description:
      "雜費、手術費、住院日額三擇一給付，每次事故上限NT$200,000，可副本理賠。",
    payoutAmount: "NT$ 200,000 / 次",
    payoutRatio: "100%",
    payoutStandard: "guaranteed",
  },
  {
    id: "p7",
    company: "三商美邦",
    companyEn: "Mercuries Life",
    category: "意外險",
    medicalType: "意外醫療 Accident Med",
    premium: 3600,
    code: "MER-AM30",
    tags: ["意外醫療實支", "骨折未住院", "門診治療", "低保費"],
    policyName: "平安守護意外傷害醫療附約",
    description: "意外醫療實支實付NT$30,000/次，含骨折未住院日額給付。",
    payoutAmount: "NT$ 30,000 / 次",
    payoutRatio: "70%",
    payoutStandard: "consult",
  },
  {
    id: "p8",
    company: "全球人壽",
    companyEn: "Transglobe Life",
    category: "重大疾病",
    medicalType: "癌症險 Cancer",
    premium: 13400,
    code: "TGL-CA5K",
    tags: ["癌症住院日額", "癌症手術", "一年期低保費", "續保彈性"],
    policyName: "抗癌保庇一年期癌症醫療",
    description: "癌症住院日額NT$5,000，癌症手術給付，可依病程續保。",
    payoutAmount: "NT$ 5,000 / 日",
    payoutRatio: "85%",
    payoutStandard: "conditional",
  },
  {
    id: "p9",
    company: "台灣人壽",
    companyEn: "Taiwan Life",
    category: "醫療險",
    medicalType: "手術險 Surgery",
    premium: 10800,
    code: "TWL-S150",
    tags: ["2000+手術項目", "門診手術", "最高20倍", "終身保障"],
    policyName: "手術金保障終身醫療險",
    description: "涵蓋2000+手術項目，門診手術亦給付，最高倍數20倍。",
    payoutAmount: "NT$ 150,000 / 次",
    payoutRatio: "95%",
    payoutStandard: "guaranteed",
  },
  {
    id: "p10",
    company: "宏泰人壽",
    companyEn: "Hontai Life",
    category: "醫療險",
    medicalType: "住院日額 Hospital",
    premium: 7200,
    code: "HTL-H2000",
    tags: ["住院日額", "癌症住院加倍", "可搭配實支", "平價入門"],
    policyName: "健康Plus住院日額醫療",
    description: "住院日額NT$2,000，含癌症住院加倍，可搭配實支實付使用。",
    payoutAmount: "NT$ 2,000 / 日",
    payoutRatio: "75%",
    payoutStandard: "consult",
    flagged: {
      source: "Mobile01 保險討論區",
      note: "部分用戶反映客服回應速度較慢，理賠文件要求較繁瑣。",
    },
  },
];

export const PAYOUT_META: Record<
  Policy["payoutStandard"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  guaranteed: {
    label: "確定會賠",
    icon: CheckCircle2,
    className: "bg-success/15 text-success border-success/30",
  },
  conditional: {
    label: "可能會理賠",
    icon: HelpCircle,
    className: "bg-warning/15 text-warning border-warning/30",
  },
  consult: {
    label: "需諮詢專員",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const policyById = (id: string) => MOCK_POLICIES.find((p) => p.id === id)!;

/* ---------------- Questionnaire ---------------- */

export interface Answers {
  age: number;
  gender: Gender;
  identity: string;
  income: string;
  risks: string[];
  mortgage: string;
  dependents: string;
  existing: string[];
  budget: number;
  preference: string;
  infoStyle: string;
}

export const DEFAULT_ANSWERS: Answers = {
  age: 21,
  gender: "female",
  identity: "學生",
  income: "50萬以下",
  risks: ["重大疾病", "意外受傷", "財產損失"],
  mortgage: "沒有",
  dependents: "沒有",
  existing: ["完全沒有"],
  budget: 3500,
  preference: "⚖️ 均衡",
  infoStyle: "概括式",
};

export const IDENTITIES = [
  "學生",
  "單身上班族",
  "已婚無小孩",
  "已婚有小孩",
  "退休族",
  "自營商",
];
export const INCOMES = ["50萬以下", "50–100萬", "100–200萬", "200萬以上"];
export const RISKS = [
  "重大疾病",
  "住院醫療花費",
  "意外受傷",
  "身故後家人生活",
  "退休金不足",
  "長期照護",
  "財產損失",
];
export const EXISTING = [
  "實支實付",
  "癌症險",
  "重大傷病",
  "意外險",
  "壽險",
  "車險",
  "儲蓄險",
  "完全沒有",
  "不確定",
];
export const PREFERENCES = ["💰 保費便宜", "🛡️ 保障完整", "⚖️ 均衡"];
export const INFO_STYLES = ["概括式", "列舉式", "不了解沒差"];

/* ---------------- Plans ---------------- */

export type PlanTier = "lite" | "standard" | "full";

export interface PlanItem {
  policyId: string;
  level: "必備" | "建議";
  categoryLabel: string;
  reason: string;
  monthly: number;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  subtitle: string;
  items: PlanItem[];
}

export const PLANS: Plan[] = [
  {
    tier: "lite",
    name: "精簡版",
    subtitle: "必備險種，用較低保費守住基本保障",
    items: [
      {
        policyId: "p6",
        level: "必備",
        categoryLabel: "實支實付醫療險",
        reason:
          "您目前沒有醫療保障，且最擔心住院與重大疾病，自費醫療可能造成較大的短期支出，因此優先補足醫療實支保障。",
        monthly: 680,
      },
      {
        policyId: "p7",
        level: "必備",
        categoryLabel: "意外醫療險",
        reason:
          "學生族群通機車、運動受傷比例高，意外醫療附約保費低但能覆蓋門診與骨折治療。",
        monthly: 300,
      },
      {
        policyId: "p10",
        level: "建議",
        categoryLabel: "住院日額醫療險",
        reason: "以低保費補上住院期間的收入與生活雜支缺口，可與實支實付互補。",
        monthly: 600,
      },
    ],
  },
  {
    tier: "standard",
    name: "標準版",
    subtitle: "均衡配置，兼顧保費與保障",
    items: [
      {
        policyId: "p6",
        level: "必備",
        categoryLabel: "實支實付醫療險",
        reason:
          "作為整體醫療保障的核心，可副本理賠並支應自費醫材與病房差額。",
        monthly: 680,
      },
      {
        policyId: "p1",
        level: "必備",
        categoryLabel: "第二張實支實付（雙實付）",
        reason:
          "單張實支上限常不足以支付高階醫材，第二張實支可拉高雜費額度，形成雙實付結構。",
        monthly: 760,
      },
      {
        policyId: "p3",
        level: "必備",
        categoryLabel: "意外傷害險",
        reason: "涵蓋意外身故與失能，交通事故加倍給付，符合您擔心的意外受傷風險。",
        monthly: 350,
      },
      {
        policyId: "p8",
        level: "必備",
        categoryLabel: "一年期癌症醫療險",
        reason:
          "您最擔心重大疾病，但年齡尚輕，一年期癌症險用較低保費先取得癌症治療保障。",
        monthly: 420,
      },
      {
        policyId: "p9",
        level: "建議",
        categoryLabel: "手術醫療險",
        reason: "涵蓋 2000+ 手術項目與門診手術，補足非住院型治療的給付缺口。",
        monthly: 520,
      },
    ],
  },
  {
    tier: "full",
    name: "完整版",
    subtitle: "完整防護，針對主要風險全面覆蓋",
    items: [
      {
        policyId: "p6",
        level: "必備",
        categoryLabel: "實支實付醫療險",
        reason: "醫療保障核心，可副本理賠，支應住院自費項目。",
        monthly: 680,
      },
      {
        policyId: "p1",
        level: "必備",
        categoryLabel: "第二張實支實付（雙實付）",
        reason: "把雜費上限拉高到 NT$380,000 等級，重大手術時自付額幾乎歸零。",
        monthly: 760,
      },
      {
        policyId: "p3",
        level: "必備",
        categoryLabel: "意外傷害險",
        reason: "意外身故與失能一次金，加上意外醫療實支，覆蓋日常通勤風險。",
        monthly: 350,
      },
      {
        policyId: "p2",
        level: "必備",
        categoryLabel: "終身癌症險",
        reason:
          "癌症治療期長、標靶自費高，一次金加療程給付可支撐長期療程與收入中斷。",
        monthly: 1180,
      },
      {
        policyId: "p5",
        level: "建議",
        categoryLabel: "重大傷病（心血管）",
        reason: "補足心血管重大傷病一次金，涵蓋心導管與支架等高額手術費用。",
        monthly: 980,
      },
      {
        policyId: "p4",
        level: "建議",
        categoryLabel: "住院日額醫療險",
        reason: "住院期間日額給付，加護病房加倍，補上收入損失。",
        monthly: 640,
      },
      {
        policyId: "p9",
        level: "建議",
        categoryLabel: "手術醫療險",
        reason: "門診手術與各式手術倍數給付，讓非住院治療也有保障。",
        monthly: 520,
      },
    ],
  },
];

export const planMonthly = (plan: Plan) =>
  plan.items.reduce((s, i) => s + i.monthly, 0);
