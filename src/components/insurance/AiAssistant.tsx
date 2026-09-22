import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowDownRight,
  ChevronDown,
  HelpCircle,
  LoaderCircle,
  MessageCircle,
  Send,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Answers, Policy } from "@/data/insurance";
import { askInsuranceLLM, type ChatMessage } from "@/lib/llm-client";
import {
  type AssistantContext,
  type AssistantMessage,
  type SuggestedQuestion,
  computeDifferences,
  generateSuggestedQuestions,
  generateSuggestedQuestionsWithLLM,
  makeSystemMessage,
  makeUserMessage,
} from "@/lib/mock-ai";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DEPTH_LABEL: Record<AssistantContext["conversationPreference"]["depth"], string> = {
  simple: "白話版",
  normal: "標準",
  pro: "專業版",
};

const DEPTH_INSTRUCTIONS: Record<AssistantContext["conversationPreference"]["depth"], string> = {
  simple: `回答時請使用真正的白話中文：先講結論，再補充原因。把「保險術語」改成一般人日常會說的話；若一定要使用術語，第一次出現時立刻用括號解釋。每段最多 2 到 3 句，優先使用短句與條列。盡量用具體情境或數字說明，不要只複述比較表欄位。避免「承保、給付條件、除外責任、保障缺口」等沒有解釋的專業詞。`,
  normal: `請使用清楚、自然的繁體中文回答：先給結論，再說明理由。可以使用常見保險術語，但第一次出現時要簡短解釋，並以條列整理重點。`,
  pro: `請使用較完整且精確的保險分析語氣：清楚區分商品差異、理賠條件、除外責任、等待期與續保規則。可以使用專業術語，但仍要以比較表中的資料為依據，不得自行推測。`,
};

export function AiAssistant({
  answers,
  selectedPolicies,
  onViewDifference,
}: {
  answers: Answers;
  selectedPolicies: Policy[];
  onViewDifference: (anchor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<AssistantContext["conversationPreference"]>({
    depth: "normal",
    focus: [],
  });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<"idle" | "generating" | "llm" | "fallback">("idle");
  const [input, setInput] = useState("");
  const [depthMenuOpen, setDepthMenuOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const [panelHeight, setPanelHeight] = useState(680);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);
  const heightResizeStart = useRef<{ y: number; height: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousPolicyIds = useRef<string | null>(null);
  const suggestionRequestId = useRef(0);

  const differences = useMemo(() => computeDifferences(selectedPolicies), [selectedPolicies]);

  const ctx: AssistantContext = useMemo(
    () => ({
      questionnaireAnswers: answers,
      selectedPolicies,
      comparisonDifferences: differences,
      conversationPreference: preference,
    }),
    [answers, selectedPolicies, differences, preference],
  );

  useEffect(() => {
    const requestId = ++suggestionRequestId.current;
    if (selectedPolicies.length === 0) {
      setQuestions([]);
      setSuggestionStatus("idle");
    } else {
      setQuestions(generateSuggestedQuestions(ctx));
      setSuggestionStatus("generating");
      void generateSuggestedQuestionsWithLLM(ctx)
        .then((nextQuestions) => {
          if (requestId === suggestionRequestId.current) {
            setQuestions(nextQuestions);
            setSuggestionStatus("llm");
          }
        })
        .catch(() => {
          if (requestId === suggestionRequestId.current) {
            setQuestions(generateSuggestedQuestions(ctx));
            setSuggestionStatus("fallback");
          }
        });
    }
    const ids = selectedPolicies.map((policy) => policy.id).sort().join(",");
    if (previousPolicyIds.current !== null && previousPolicyIds.current !== ids) {
      setMessages((messages) => [
        ...messages,
        {
          id: Math.random().toString(36).slice(2),
          role: "system",
          content: "比較商品已更新，已重新分析目前差異。",
        },
      ]);
    }
    previousPolicyIds.current = ids;
  }, [ctx, selectedPolicies]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, questions]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, thinking]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (resizeStart.current) {
        const nextWidth = resizeStart.current.width - (event.clientX - resizeStart.current.x);
        const maxWidth = Math.min(window.innerWidth * 0.9, 720);
        setPanelWidth(Math.min(Math.max(nextWidth, 320), maxWidth));
      }
      if (heightResizeStart.current) {
        const nextHeight = heightResizeStart.current.height - (event.clientY - heightResizeStart.current.y);
        const maxHeight = Math.min(window.innerHeight * 0.9, 680);
        setPanelHeight(Math.min(Math.max(nextHeight, 420), maxHeight));
      }
    };

    const stopResize = () => {
      resizeStart.current = null;
      heightResizeStart.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, []);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeStart.current = { x: event.clientX, width: panelWidth };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startHeightResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    heightResizeStart.current = {
      y: event.clientY,
      height: event.currentTarget.parentElement?.getBoundingClientRect().height ?? panelHeight,
    };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const ask = async (text: string) => {
    if (!text.trim() || thinking) return;
    const question = text.trim();
    const previousMessages: ChatMessage[] = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: message.content }));
    setMessages((m) => [...m, makeUserMessage(question)]);
    setThinking(true);
    try {
      const context = [
        "你是 HealthWise 的保險比較助手。請只根據提供的問卷、保單與比較差異回答，不要捏造保險條款；若資料不足，請明確說明需要確認正式條款。回答使用繁體中文，清楚、具體、避免保證式的投保建議。",
        `目前回答深度為「${DEPTH_LABEL[preference.depth]}」。請嚴格遵守以下寫作規則：${DEPTH_INSTRUCTIONS[preference.depth]}`,
        `問卷資料：${JSON.stringify(answers)}`,
        `目前比較保單：${JSON.stringify(selectedPolicies)}`,
        `比較差異：${JSON.stringify(differences)}`,
        `回答偏好：${JSON.stringify(preference)}`,
      ].join("\n");
      const content = await askInsuranceLLM(`${context}\n\n使用者問題：${question}`, previousMessages);
      if (!content.trim()) throw new Error("LLM 回傳空白內容");
      setMessages((m) => [
        ...m,
        { id: Math.random().toString(36).slice(2), role: "assistant", content },
      ]);
      setSuggestionStatus("generating");
      void generateSuggestedQuestionsWithLLM(ctx)
        .then((nextQuestions) => {
          setQuestions(nextQuestions);
          setSuggestionStatus("llm");
        })
        .catch(() => {
          setQuestions(generateSuggestedQuestions(ctx));
          setSuggestionStatus("fallback");
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : "無法取得 AI 回覆";
      setMessages((m) => [...m, makeSystemMessage(`AI 暫時無法回覆：${message}`)]);
    } finally {
      setThinking(false);
    }
  };

  const changeDepth = (depth: AssistantContext["conversationPreference"]["depth"]) => {
    setPreference((current) => ({ ...current, depth }));
    setDepthMenuOpen(false);
    setMessages((current) => [
      ...current,
      makeSystemMessage(`已切換回答深度為「${DEPTH_LABEL[depth]}」，接下來的回答會套用此設定。`),
    ]);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 h-14 rounded-full px-5 text-base shadow-[var(--shadow-elegant)] bg-[image:var(--gradient-hero)] hover:opacity-95"
      >
        <MessageCircle className="h-5 w-5" />
        AI 比較助手
      </Button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex max-h-[90vh] min-h-[420px] min-w-[320px] max-w-[min(90vw,720px)] resize-y flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]"
      style={{
        width: `min(${panelWidth}px, calc(100vw - 2.5rem))`,
        height: `min(${panelHeight}px, calc(100vh - 3rem))`,
      }}
    >
      <div
        role="separator"
        aria-label="調整 AI 比較助手高度"
        aria-orientation="horizontal"
        onPointerDown={startHeightResize}
        className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize touch-none"
      />
      <div
        role="separator"
        aria-label="調整 AI 比較助手寬度"
        aria-orientation="vertical"
        onPointerDown={startResize}
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize touch-none"
      />
      <div className="flex items-center gap-2 px-4 py-3 bg-[image:var(--gradient-hero)] text-primary-foreground">
        <MessageCircle className="h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">AI 比較助手</div>
          <div className="text-[11px] opacity-85 truncate">
            正在比較 {selectedPolicies.length} 張保單 · {DEPTH_LABEL[preference.depth]}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="收起助手"
          onClick={() => setOpen(false)}
          className="ml-auto h-8 w-8 text-primary-foreground hover:bg-white/20"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-xl bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
            我已讀取您的問卷（{answers.age} 歲／{answers.identity}／月預算 NT$
            {answers.budget.toLocaleString()}）與目前比較表中的差異。
            {selectedPolicies.length === 0
              ? "請先勾選或一鍵比較保單，我就能提出針對性的問題。"
              : "下面是我認為您最該先問的 3 個問題。"}
          </div>
        )}

        {messages.map((m) =>
          m.role === "system" ? (
            <div
              key={m.id}
              className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
            >
              {m.content}
            </div>
          ) : m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2">
              <div className="text-sm leading-relaxed text-foreground">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      table: ({ children }) => (
        <div className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border border-border px-3 py-2 align-top">
          {children}
        </td>
      ),
      ul: ({ children }) => (
        <ul className="my-2 list-disc pl-5">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2 list-decimal pl-5">
          {children}
        </ol>
      ),
      p: ({ children }) => (
        <p className="my-2">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold">
          {children}
        </strong>
      ),
    }}
  >
    {m.content}
  </ReactMarkdown>
</div>
              {m.anchor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDifference(m.anchor!)}
                  className="h-8 text-xs"
                >
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  查看比較表中的這項差異
                </Button>
              )}
            </div>
          ),
        )}

        {thinking && (
          <div className="text-sm text-muted-foreground animate-pulse">正在分析比較表差異…</div>
        )}

        {questions.length > 0 && !thinking && (
          <div className="space-y-2 pt-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              建議你問（依商品差異產生）
            </div>
            {suggestionStatus === "generating" && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                目前先顯示暫用問題，AI正在生成更個人化的推薦問題…
              </div>
            )}
            {suggestionStatus === "fallback" && (
              <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                AI目前暫時無法生成推薦問題，目前顯示的是系統暫用問題。
              </div>
            )}
            {suggestionStatus === "llm" && (
              <div className="text-[11px] text-muted-foreground">以上推薦問題由AI根據目前問卷與比較差異生成</div>
            )}
            {questions.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-border bg-background/60 p-3 space-y-2"
              >
                <button
                  type="button"
                  onClick={() => ask(q.text)}
                  className="text-left text-sm font-medium hover:text-primary transition-colors"
                >
                  {q.text}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-xs text-primary hover:underline">
                            為什麼建議這題？
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px]">
                          {q.why}
                        </TooltipContent>
                      </Tooltip>
                    </PopoverTrigger>
                    <PopoverContent side="top" className="w-80">
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold">為什麼建議這題？</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{q.why}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {q.anchor && (
                    <button
                      type="button"
                      onClick={() => onViewDifference(q.anchor!)}
                      className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      <ArrowDownRight className="h-3 w-3" />
                      {q.anchorLabel ?? "查看比較表中的這項差異"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2 bg-card">
        <div className="flex flex-wrap gap-1.5">
          <Popover open={depthMenuOpen} onOpenChange={setDepthMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-expanded={depthMenuOpen}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                深度：{DEPTH_LABEL[preference.depth]}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-48 p-2">
              <div className="space-y-1.5">
                {(["simple", "normal", "pro"] as const).map((depth) => (
                  <button
                    type="button"
                    key={depth}
                    onClick={() => changeDepth(depth)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      preference.depth === depth
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="font-medium">{DEPTH_LABEL[depth]}</div>
                    <div className="text-xs opacity-75">
                      {depth === "simple" && "白話版，簡單說明"}
                      {depth === "normal" && "標準版，均衡清楚度"}
                      {depth === "pro" && "專業版，深入分析"}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {preference.focus.map((f) => (
            <Badge
              key={f}
              variant="outline"
              className={cn("text-[11px]", "border-teal/40 text-teal")}
            >
              關注：{f}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                ask(input);
                setInput("");
              }
            }}
            placeholder="也可以直接問我任何比較問題…"
            className="h-10"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label="送出問題"
            disabled={thinking || !input.trim()}
            onClick={() => {
              ask(input);
              setInput("");
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="sr-only" aria-label="關閉">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
