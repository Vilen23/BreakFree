"use client"

import { useEffect, useState, useRef } from "react"
import {
  PenLine,
  Search,
  Plus,
  Calendar,
  MoreVertical,
  Smile,
  Frown,
  Meh,
  Send,
  ChevronLeft,
  Sparkles
} from "lucide-react"
import api from "../lib/api" // your API helper (axios instance)
import { cn } from "@/lib/utils"

// Mock entries fallback (used if API doesn't return a list)
const FALLBACK_ENTRIES = [
  {
    id: "2025-11-20",
    dateISO: "2025-11-20",
    dateDisplay: "Wednesday, Nov 20",
    preview: "Today was a tiring day...",
    mood: "tired",
  },
  {
    id: "2025-11-19",
    dateISO: "2025-11-19",
    dateDisplay: "Tuesday, Nov 19",
    preview: "Felt really productive with the new...",
    mood: "happy",
  },
  {
    id: "2025-11-18",
    dateISO: "2025-11-18",
    dateDisplay: "Monday, Nov 18",
    preview: "Anxiety was high in the morning but...",
    mood: "anxious",
  },
  {
    id: "2025-11-17",
    dateISO: "2025-11-17",
    dateDisplay: "Sunday, Nov 17",
    preview: "Rest day. Spent time with family...",
    mood: "calm",
  },
] 

type Entry = typeof FALLBACK_ENTRIES[number]

export default function JournalingPage() {
  // --- UI & app state (merged from both versions) ---
  const [entries, setEntries] = useState<Entry[]>([])
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null) // for left sidebar highlight
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // ISO date e.g. "2025-11-20"

  // journaling states (from old functional page)
  const [text, setText] = useState<string>("")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>>([])
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false)
  const [conversationUnlocked, setConversationUnlocked] = useState<boolean>(false)
  const [journalEntry, setJournalEntry] = useState<{ conversation_unlocked?: boolean; ai_response?: string | null; content?: string } | null>(null)
  // conversation mock fallback to show UI when nothing loaded
  const [conversationStream, setConversationStream] = useState([
    {
      role: "user",
      text: "Ah today was a tiring day",
      time: "8:30 PM"
    },
    {
      role: "companion",
      text: "It sounds like you had a long day! With your goal of reducing social media to spend more time with loved ones, it's understandable that you might feel drained. What sensations are you experiencing in your body right now?",
      time: "8:31 PM"
    }
  ])

  // textarea input for new messages in new layout (keeps same as 'text')
  const [input, setInput] = useState("")

  // small refs to avoid repeated effects
  const mountedRef = useRef(false)

  // Mood icon helper (from your new layout)
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case "happy": return <Smile className="w-4 h-4 text-teal-400" />
      case "tired": return <Frown className="w-4 h-4 text-slate-400" />
      case "anxious": return <Meh className="w-4 h-4 text-orange-400" />
      case "calm": return <Sparkles className="w-4 h-4 text-blue-400" />
      default: return <PenLine className="w-4 h-4 text-slate-400" />
    }
  }

  // ---------- Fetch entries list (try API, fallback to mock) ----------
  const fetchEntriesList = async () => {
    try {
      // Fetch list of dates that have journal entries
      const { data: dateList } = await api.get("/journal/dates")
      if (Array.isArray(dateList) && dateList.length > 0) {
        const mappedPromises = dateList.map(async (dateISO: string) => {
          try {
            const { data } = await api.get(`/journal/${dateISO}`)
            return {
              id: dateISO,
              dateISO,
              dateDisplay: new Date(dateISO).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
              preview: data?.preview || (data?.content ? data.content.slice(0, 80) : ""),
              mood: data?.mood || "calm",
            } as Entry
          } catch (err) {
            console.warn(`Could not fetch journal entry for ${dateISO}`, err)
            return null
          }
        })

        const mapped = (await Promise.all(mappedPromises)).filter((entry): entry is Entry => Boolean(entry))
        setEntries(mapped)
        setActiveEntry(mapped[0] ?? null)
        return
      }
    } catch (err) {
      // ignore and fallback
      console.warn("Could not fetch journal list; using fallback entries", err)
    }
    setEntries([])
    setActiveEntry(null)
  }

  // ---------- Auto-select today's journal entry on mount if exists ----------
  useEffect(() => {
    fetchEntriesList()
    const checkTodayJournal = async () => {
      try {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const dd = String(now.getDate()).padStart(2, '0')
        const today = `${yyyy}-${mm}-${dd}`

        // If your backend has GET /journal/:date which returns 200 if exists
        await api.get(`/journal/${today}`)
        // If it exists, auto-select it and load
        setSelectedDate(today)
        setAiReply(null)
        await loadJournalEntry(today)
        await loadMessages(today)
      } catch (err: any) {
        // 404 means not found — that's fine
        if (err?.response?.status !== 404) {
          console.error("Error checking today's journal:", err)
        }
      }
    }

    // run once on mount
    if (!mountedRef.current) {
      mountedRef.current = true
      checkTodayJournal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Auto-save text (like your old page) ----------
  useEffect(() => {
    if (text.trim()) {
      const timer = setTimeout(() => setLastSaved(new Date()), 2000) // after 2s of inactivity
      return () => clearTimeout(timer)
    }
    // when text is empty, we do not update lastSaved
  }, [text])

  // ---------- API helpers (copied from old implementation) ----------
  const loadMessages = async (date: string) => {
    try {
      setLoadingMessages(true)
      const { data } = await api.get(`/journal/${date}/messages`)
      setMessages(data)
    } catch (e) {
      console.error("loadMessages error", e)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const loadJournalEntry = async (date: string) => {
    try {
      const { data } = await api.get(`/journal/${date}`)
      setJournalEntry(data)
      setConversationUnlocked(Boolean(data?.conversation_unlocked))
      if (data?.ai_response && !aiReply) setAiReply(data.ai_response)
    } catch (e) {
      console.error("loadJournalEntry error", e)
      setJournalEntry(null)
      setConversationUnlocked(false)
    }
  }

  const handleSelectDate = async (dateISO: string) => {
    // when user clicks a sidebar entry
    setAiReply(null)
    setSelectedDate(dateISO)
    const found = entries.find((en) => en.dateISO === dateISO)
    if (found) setActiveEntry(found)
    await Promise.all([
      loadJournalEntry(dateISO),
      loadMessages(dateISO)
    ])
  }

  // ---------- Submit flow (merges old behavior into new layout) ----------
  const handleSubmit = async (contentOverride?: string) => {
    // This uses the old logic: create journal if missing, then post a message with generate_ai true
    const content = (typeof contentOverride === "string" ? contentOverride : text).trim()
    if (!content) return
    setIsSubmitting(true)
    setAiReply(null)
    try {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const date = `${yyyy}-${mm}-${dd}`
      setSelectedDate(date)

      // Check if journal exists; if it does, post a message; else create the journal
      try {
        await api.get(`/journal/${date}`)
        const { data: messageData } = await api.post('/journal/message', { date, content, generate_ai: true })
        // extract AI assistant message if present
        const aiMessage = messageData.find((m: any) => m.role === 'assistant' || m.role === 'ai')
        if (aiMessage) setAiReply(aiMessage.content)
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 404) {
          // create new journal entry first
          const { data } = await api.post('/journal', { date, content })
          setAiReply(data.ai_response ?? null)
          // also create a message with generate_ai
          await api.post('/journal/message', { date, content, generate_ai: true })
        } else {
          throw err
        }
      }

      // refresh messages & entry
      await loadMessages(date)
      await loadJournalEntry(date)
      setText("") // clear editor after submit (old behavior)
      setInput("")
    } catch (e) {
      console.error("submit error", e)
    } finally {
      setIsSubmitting(false)
    }
  }

  // handle unlocking conversation (old endpoint)
  const handleUnlockConversation = async () => {
    if (!selectedDate) return
    try {
      const { data } = await api.put(`/journal/${selectedDate}/unlock-conversation`)
      setConversationUnlocked(true)
      setJournalEntry(data)
    } catch (e) {
      console.error("unlock error", e)
    }
  }

  // ---------- UI handlers (left sidebar entry click uses handleSelectDate) ----------
  const handleSidebarClick = (entry: any) => {
    // entry.dateISO expected
    handleSelectDate(entry.dateISO)
  }

  // When user presses "Send" from the new layout's text area:
  const handleSendFromNewLayout = async () => {
    // Mirror handleSubmit behaviour but using `input` as the content (so user typed into new page input)
    if (!input.trim()) return
    await handleSubmit(input)
  }

  const isLockedView = Boolean(
    selectedDate &&
    !conversationUnlocked &&
    !loadingMessages &&
    (messages.length > 0 || journalEntry?.content)
  )

  const isLoadingContent = Boolean(selectedDate && loadingMessages)

  const shouldShowInitialComposer = !selectedDate && !isLockedView && !isLoadingContent

  const renderHeaderDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    : (activeEntry?.dateDisplay ?? "Today's Plan")

  // ---------- render ----------
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* Left Sidebar - History & Navigation */}
      <div className="relative hidden w-80 flex-col border-r border-slate-800 bg-[#0f172a] text-slate-300 lg:flex">
        <div className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-teal-900/10 blur-3xl" />
          <div className="absolute bottom-[20%] right-[-10%] h-[200px] w-[200px] rounded-full bg-blue-900/10 blur-3xl" />
        </div>

        <div className="relative z-10 p-6 pb-2 mt-[8vh]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <PenLine className="w-5 h-5 text-teal-500" />
              Journal
            </h1>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer">
              <Search className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              // create new entry locally (user can then submit content)
              const now = new Date()
              const iso = now.toISOString().slice(0, 10)
              const newEntry: Entry = {
                id: iso,
                dateISO: iso,
                dateDisplay: now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
                preview: "",
                mood: "calm"
              }
              setEntries((prev) => [newEntry, ...prev.filter(e => e.dateISO !== iso)])
              setActiveEntry(newEntry)
              setSelectedDate(iso)
              setText("")
              setInput("")
            }}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-all hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-900/20 active:scale-95 cursor-pointer mb-6"
          >
            <Plus className="w-4 h-4" />
            Create New Entry
          </button>

          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Recent Entries
          </div>
        </div>

        {/* Entry List */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {entries.length === 0 && (
            <div className="text-center text-slate-500 text-sm px-4 py-10 border border-white/10 rounded-xl bg-white/5">
              No journal entries yet. Create one to get started.
            </div>
          )}
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleSidebarClick(entry)}
              className={cn(
                "w-full text-left p-4 rounded-xl transition-all border border-transparent cursor-pointer group",
                entry.dateISO === selectedDate
                  ? "bg-white/10 border-teal-500/50 shadow-sm"
                  : "hover:bg-white/5 hover:border-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-sm font-medium",
                  entry.dateISO === selectedDate ? "text-teal-400" : "text-slate-200"
                )}>
                  {entry.dateDisplay}
                </span>
                {getMoodIcon(entry.mood)}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {entry.preview}
              </p>
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="relative z-10 p-4 border-t border-white/5 bg-[#0f172a]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-teal-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Jane Doe</div>
              <div className="text-xs text-slate-500">Free Plan</div>
            </div>
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Right Panel - Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-semibold text-slate-900">Journal</span>
          <button className="p-2 -mr-2 hover:bg-slate-100 rounded-full">
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Top Header */}
        <div className="bg-white mt-[5vh] px-10 pt-10 pb-6 shadow-sm border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-2">Today</p>
            <h2 className="text-3xl font-semibold text-slate-900">{renderHeaderDate}</h2>
            <div className="flex items-center gap-3 text-slate-500 mt-3">
              <span className="flex items-center gap-1.5 text-base">
                {getMoodIcon(activeEntry?.mood ?? "calm")}
                <span className="capitalize font-medium">{activeEntry?.mood ?? "calm"}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-base">{(new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-3 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-2xl transition-colors cursor-pointer" title="View Insights">
              <Sparkles className="w-5 h-5" />
            </button>
            <button className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer">
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Area / New Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Loading state */}
            {isLoadingContent && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-500">
                Loading your journal...
              </div>
            )}

            {/* Prompt Card */}
            {!isLockedView && !isLoadingContent && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-medium text-teal-600 mb-2 uppercase tracking-wide">Daily Prompt</h3>
                <p className="text-lg text-slate-800 font-medium">How are you feeling today?</p>
              </div>
            )}

            {/* Conversation Stream (or journal content / companion responses) */}
            {/* We will follow your old conditional logic:
                - Show composition box (when unlocked or no selectedDate)
                - Show journal entry + companion when exists and conversation locked
                - Show unlocked conversation when unlocked
                - Show aiReply when returned after submit
            */}

            {/* 1) Main composition card (only show when there's no existing entry yet) */}
            {shouldShowInitialComposer && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <label className="block text-gray-700 text-base font-medium mb-4">How are you feeling today?</label>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setInput(e.target.value)
                  }}
                  placeholder="Take your time. Write whatever's on your mind..."
                  className="w-full min-h-[160px] p-4 pr-12 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400"
                />
                <div className="flex justify-end mt-4">
                  <button
                  onClick={() => handleSubmit()}
                    disabled={!text.trim() || isSubmitting}
                    className="px-6 py-2 rounded-full bg-black text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
                <div className="mt-3 text-sm text-slate-500">Last saved: {lastSaved ? lastSaved.toLocaleTimeString() : 'Not saved yet'}</div>
              </div>
            )}

            {/* 2) Show journal entry and companion response in one box when conversation is locked */}
            {selectedDate && !loadingMessages && messages.length > 0 && !conversationUnlocked && (
              <div className="mt-6 max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 space-y-6">
                    {journalEntry?.content && (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Journal Entry</h2>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{journalEntry.content}</p>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Companion</h2>
                      <p className="text-gray-700 leading-relaxed">{aiReply || journalEntry?.ai_response || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <p className="text-gray-600 text-sm">Need further assistance?</p>
                  <button
                    onClick={handleUnlockConversation}
                    className="px-6 py-2 bg-black text-white rounded-full"
                  >
                    Unlock Conversation
                  </button>
                </div>
              </div>
            )}

            {/* 3) Show companion response for new submissions (when no messages loaded yet) */}
            {aiReply && !isLoadingContent && (!selectedDate || (messages.length === 0 && !loadingMessages)) && (
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Companion</h2>
                    <p className="text-gray-700 leading-relaxed">{aiReply}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4) Chat thread (new layout) */}
            {selectedDate && conversationUnlocked && !loadingMessages && messages.length > 0 && (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((m) => {
                  const isAssistant = m.role === 'assistant'
                  return (
                    <div key={m.id} className={cn(
                      "flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300",
                      isAssistant ? "items-start" : "items-end"
                    )}>
                      <div className={cn(
                        "max-w-[85%] rounded-2xl p-5 text-base leading-relaxed shadow-sm border",
                        isAssistant
                          ? "bg-teal-50/60 border-teal-100 text-slate-800 rounded-tl-sm"
                          : "bg-white border-slate-100 text-slate-800 rounded-tr-sm"
                      )}>
                        <p>{m.content}</p>
                      </div>
                      <span className="text-xs text-slate-400 px-2">
                        {isAssistant ? "Companion AI" : "You"} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Fallback mock conversation when no entry selected */}
            {!selectedDate && !isLoadingContent && (
              <div className="space-y-6 max-w-3xl mx-auto">
                {conversationStream.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl p-5 text-base leading-relaxed shadow-sm border",
                      msg.role === "user"
                        ? "bg-white border-slate-100 text-slate-800 rounded-tr-sm"
                        : "bg-teal-50/60 border-teal-100 text-slate-800 rounded-tl-sm"
                    )}>
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-xs text-slate-400 px-2">
                      {msg.role === "user" ? "You" : "Companion AI"} • {msg.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Area (new layout input) */}
        {!isLockedView && (
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Take your time. Write whatever's on your mind..."
                className="w-full min-h-[120px] p-4 pr-12 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  onClick={handleSendFromNewLayout}
                  className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors shadow-sm hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">
              This is a judgment-free zone. Your thoughts and feelings are valid.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
