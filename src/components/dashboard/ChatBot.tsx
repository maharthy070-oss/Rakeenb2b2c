import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Inspection } from "@/lib/inspections";
import { buildChatContext } from "@/lib/buildChatContext";
import { GEMINI_API_KEY, GEMINI_MODEL } from "@/lib/geminiConfig";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "ما هي أسوأ 3 مواقع أداءً؟",
  "أعطني بطاقة عن شاخص 8/520",
  "قارن بين أداء ركين وسنا",
  "أي المواقع تحتاج تدخل عاجل؟",
];

interface ChatBotProps {
  inspections: Inspection[];
}

const SYSTEM_PROMPT = (context: string) => `أنت مساعد ذكي متخصص في تحليل بيانات جاهزية مخيمات الحج لقطاع المشاعر (ركين وسنا) لعام 1447هـ.

مهامك:
- تحليل أداء المواقع (الشواخص) ومقارنتها
- تقديم بطاقات معلومات (vCards) مختصرة عن أي موقع يطلبه المستخدم
- اقتراح المواقع التي تحتاج تدخلاً عاجلاً
- شرح الاتجاهات والتحسن أو التراجع في الأداء
- الإجابة بشكل موجز ومباشر باللغة العربية

عند تقديم بطاقة موقع، استخدم تنسيق Markdown منظم يتضمن:
- 🏕️ رقم الشاخص
- 🏢 الشركة
- 👤 المراقب / رئيس المركز
- 📊 آخر نتيجة + المتوسط
- 📈 الاتجاه
- ⚠️ أبرز النواقص (إن وجدت)

البيانات الحالية:
${context}`;

export function ChatBot({ inspections }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
      const body = {
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT(buildChatContext(inspections)) }],
        },
        contents: newMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "خطأ");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${errText.slice(0, 300)}` },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let assistantStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const parts = parsed?.candidates?.[0]?.content?.parts;
            const chunk = Array.isArray(parts)
              ? parts.map((p: any) => p?.text ?? "").join("")
              : "";
            if (chunk) {
              assistantSoFar += chunk;
              if (!assistantStarted) {
                assistantStarted = true;
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: assistantSoFar },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
                  ),
                );
              }
            }
          } catch {
            textBuffer = "data: " + jsonStr + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "خطأ في الاتصال"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-2xl",
          "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground",
          "flex items-center justify-center transition-all hover:scale-110",
          "border-2 border-primary-foreground/20",
        )}
        aria-label="فتح المساعد الذكي"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div
          dir="rtl"
          className={cn(
            "fixed bottom-24 left-6 z-50 w-[min(420px,calc(100vw-3rem))]",
            "h-[min(620px,calc(100vh-8rem))] flex flex-col",
            "rounded-2xl border border-border bg-card shadow-2xl",
            "animate-in fade-in slide-in-from-bottom-4 duration-200",
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-l from-primary/10 to-transparent rounded-t-2xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">المساعد الذكي</div>
              <div className="text-[11px] text-muted-foreground">
                تحليل بيانات المواقع والمراكز · Gemini
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6 space-y-3">
                <Bot className="w-10 h-10 mx-auto text-primary/60" />
                <p>اسألني عن أداء المواقع، النواقص، أو اطلب بطاقة عن أي شاخص.</p>
                <div className="grid gap-2 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-right text-xs px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary border border-border transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-secondary/80 text-foreground rounded-tl-sm",
                  )}
                >
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-strong:text-current dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-secondary/80 rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-border p-3 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك…"
              disabled={isLoading}
              className="text-right"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
