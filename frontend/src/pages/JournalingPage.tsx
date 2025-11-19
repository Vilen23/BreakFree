import { useState, useEffect } from 'react';
import api from '../lib/api';
import JournalSideBar from '../components/JournalSideBar';

export default function JournalingPage() {
  const [text, setText] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string }>>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [conversationUnlocked, setConversationUnlocked] = useState<boolean>(false);
  const [journalEntry, setJournalEntry] = useState<{ conversation_unlocked: boolean; ai_response: string | null; content: string } | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (text.trim()) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000); // Save after 2 seconds of no typing

      return () => clearTimeout(timer);
    }
  }, [text]);

  // Auto-select today's journal entry on page load if it exists
  useEffect(() => {
    const checkTodayJournal = async () => {
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const today = `${yyyy}-${mm}-${dd}`;
        
        // Check if journal exists for today
        await api.get(`/journal/${today}`);
        // If it exists, auto-select it
        setSelectedDate(today);
        setAiReply(null);
        await loadJournalEntry(today);
        await loadMessages(today);
      } catch (err: any) {
        // Journal doesn't exist for today, do nothing
        if (err?.response?.status !== 404) {
          console.error('Error checking today\'s journal:', err);
        }
      }
    };

    checkTodayJournal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setAiReply(null);
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;
      setSelectedDate(date);
      // If journal exists, add message; else create journal first
      try {
        await api.get(`/journal/${date}`);
        const { data: messageData } = await api.post('/journal/message', { date, content: text, generate_ai: true });
        // Extract AI response from messages if available
        const aiMessage = messageData.find((m: any) => m.role === 'assistant');
        if (aiMessage) {
          setAiReply(aiMessage.content);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          const { data } = await api.post('/journal', { date, content: text });
          setAiReply(data.ai_response ?? null);
          await api.post('/journal/message', { date, content: text, generate_ai: true });
        } else {
          throw err;
        }
      }
      await loadMessages(date);
      await loadJournalEntry(date);
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadMessages = async (date: string) => {
    try {
      setLoadingMessages(true);
      const { data } = await api.get(`/journal/${date}/messages`);
      setMessages(data);
    } catch (e) {
      console.error(e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadJournalEntry = async (date: string) => {
    try {
      const { data } = await api.get(`/journal/${date}`);
      setJournalEntry(data);
      setConversationUnlocked(data.conversation_unlocked || false);
      if (data.ai_response && !aiReply) {
        setAiReply(data.ai_response);
      }
    } catch (e) {
      console.error(e);
      setJournalEntry(null);
      setConversationUnlocked(false);
    }
  };

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setAiReply(null);
    await loadJournalEntry(date);
    await loadMessages(date);
  };

  const handleUnlockConversation = async () => {
    if (!selectedDate) return;
    try {
      const { data } = await api.put(`/journal/${selectedDate}/unlock-conversation`);
      setConversationUnlocked(true);
      setJournalEntry(data);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTimeAgo = (date: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return 'Auto-saved just now';
    if (diff === 1) return 'Auto-saved 1 minute ago';
    return `Auto-saved ${diff} minutes ago`;
  };

  return (
    <div className="h-[92vh] mt-[8vh] bg-gray-50 flex items-start overflow-y-hidden">
        <JournalSideBar onSelectDate={handleSelectDate} selectedDate={selectedDate} />
        <div className='flex-1 h-[92vh] overflow-y-hidden flex justify-center items-start '>
        <div className="w-[95%] flex flex-col h-[92vh] overflow-y-hidden justify-between py-2">

        {/* Main Content Card - Only show when conversation is unlocked or no entry exists */}
        {(!selectedDate || conversationUnlocked || (selectedDate && !loadingMessages && messages.length === 0)) && (
          <div className=" w-full rounded-lg overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <label className="block text-gray-700 text-base  font-medium mb-4">
                How are you feeling today?
              </label>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Take your time. Write whatever's on your mind..."
                className="w-full h-24 p-4 border-2 border-gray-300/70 rounded-md resize-none text-gray-700 placeholder-gray-400 leading-relaxed focus:outline-none "
                style={{ fontSize: '16px' }}
              />
              <div className='flex justify-end w-full'>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || isSubmitting}
                className="px-6 cursor-pointer py-2 hover:opacity-70 bg-black rounded-full text-white  font-medium  focus:outline-none   disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              </div>
            </div>
          </div>
        )}

        {/* Show journal entry and companion response in one box when conversation is not unlocked */}
        {selectedDate && !loadingMessages && messages.length > 0 && !conversationUnlocked && (
          <div className="mt-6 max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 space-y-6">
                {/* Your Journal Entry */}
                {journalEntry?.content && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Journal Entry</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{journalEntry.content}</p>
                  </div>
                )}
                
                {/* Companion Response */}
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Companion</h2>
                  <p className="text-gray-700 leading-relaxed">{aiReply || journalEntry?.ai_response || ''}</p>
                </div>
              </div>
            </div>
            
            {/* Separate Unlock Conversation Button */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-gray-600 text-sm">Need further assistance?</p>
              <button
                onClick={handleUnlockConversation}
                className="px-6 py-2 cursor-pointer bg-black hover:opacity-70 rounded-full text-white font-medium transition-colors"
              >
                Unlock Conversation
              </button>
            </div>
          </div>
        )}

        {/* Show companion response for new submissions (when no messages loaded yet) */}
        {aiReply && (!selectedDate || (messages.length === 0 && !loadingMessages)) && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Companion</h2>
                <p className="text-gray-700 leading-relaxed">{aiReply}</p>
              </div>
            </div>
          </div>
        )}

        {/* Show conversation box only when unlocked */}
        {selectedDate && !loadingMessages && messages.length > 0 && conversationUnlocked && (
          <div className=" w-full mx-auto h-[62vh]">
            <div className="bg-white rounded-lg h-full shadow-sm border border-gray-200">
              <div className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversation on {selectedDate}</h2>
                <div className="mt-2 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                  <ul className="space-y-4">
                    {messages.map((m) => {
                      const isAssistant = m.role === 'assistant';
                      return (
                        <li
                          key={m.id}
                          className={`flex ${isAssistant ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                              isAssistant
                                ? 'bg-blue-50 border-blue-100 text-blue-900 rounded-tr-sm'
                                : 'bg-gray-100 border-gray-200 text-gray-800 rounded-tl-sm'
                            }`}
                          >
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                              {isAssistant ? 'Companion' : 'You'}
                            </div>
                            <p>{m.content}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Support Text */}
        <div className="text-center ">
          <p className="text-sm text-gray-500">
            This is a judgment-free zone. Your thoughts and feelings are valid.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}