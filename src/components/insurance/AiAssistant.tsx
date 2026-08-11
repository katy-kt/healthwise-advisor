import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Send,
  Sliders,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Answers, Policy } from "@/data/insurance";
import {
  type AssistantContext,
  type AssistantMessage,
  type SuggestedQuestion,
  computeDifferences,
  generateMockAIResponse,
  generateSuggestedQuestions,
  makeUserMessage,
  regenerateQuestions,
} from "@/lib/mock-ai";
import { cn } from "@/lib/utils";

const DEPTH_LABEL: Record<AssistantContext["conversationPreference"]["depth"], string> = {
  simple: "白話版",
  normal: "標準",
  pro: "專業版",
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
  const [input, setInput] = useState("");
  const [styleInput, setStyleInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Proactive suggestions whenever the compared products or preference change.
  useEffect(() => {
    if (selectedPolicies.length === 0) {
      setQuestions([]);
      return;
    }
    setQuestions(generateSuggestedQuestions(ctx));
  }, [ctx, selectedPolicies.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, questions]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, thinking]);

  const ask = (text: string) => {
    if (!text.trim() || thinking) return;
    setMessages((m) => [...m, makeUserMessage(text.trim())]);
    setThinking(true);
    window.setTimeout(() => {
      const reply = generateMockAIResponse(text.trim(), ctx);
      setMessages((m) => [...m, reply]);
      setThinking(false);
      // Follow-up proactive questions after every answer.
      setQuestions(generateSuggestedQuestions(ctx));
    }, 700);
  };

  const applyStyle = () => {
    if (!styleInput.trim()) return;
    const { questions: qs, preference: pref } = regenerateQuestions(styleInput.trim(), ctx);
    setPreference(pref);
    setQuestions(qs);
    setMessages((m) => [
      ...m,
      makeUserMessage(styleInput.trim()),
      {
        id: Math.random().toString(36).slice(2),
        role: "system",
        content: `已記住您的偏好：說明深度「${DEPTH_LABEL[pref.depth]}」${
          pref.focus.length ? `、重點關注「${pref.focus.join("、")}」` : ""
        }。以下建議問題已依此重新產生。`,
      },
    ]);
    setStyleInput("");
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
    <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[420px] rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)] overflow-hidden flex flex-col max-h-[min(680px,calc(100vh-3rem))]">
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
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {m.content}
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
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
              建議你問（依問卷 + 商品差異產生）
            </div>
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
        <div className="flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={styleInput}
            onChange={(e) => setStyleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyStyle();
            }}
            placeholder="調整建議問題風格，例如「講簡單一點」「多問理賠條款」"
            className="h-9 text-xs"
          />
          <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={applyStyle}>
            套用
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[11px]">
            深度：{DEPTH_LABEL[preference.depth]}
          </Badge>
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
