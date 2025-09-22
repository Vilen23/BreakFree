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

  // Auto-save functionality
  useEffect(() => {
    if (text.trim()) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000); // Save after 2 seconds of no typing

      return () => clearTimeout(timer);
    }
  }, [text]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setAiReply(null);
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const date = `${yyyy}-${mm}-${dd}`;
      const { data } = await api.post('/journal', { date, content: text });
      setAiReply(data.ai_response ?? null);
      setSelectedDate(date);
      await loadMessages(date);
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

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setAiReply(null);
    await loadMessages(date);
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
    <div className="h-[92vh] mt-[8vh] bg-gray-50 flex">
      <JournalSideBar onSelectDate={handleSelectDate} selectedDate={selectedDate} />
      <div className='w-full flex justify-center items-center '>
      <div className="w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Your Safe Space
          </h1>
          <p className="text-gray-600 text-lg">
            Express yourself freely, we'll hold space for you
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <label className="block text-gray-700 text-base font-medium mb-4">
              How are you feeling today?
            </label>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Take your time. Write whatever's on your mind..."
              className="w-full h-64 p-4 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400 leading-relaxed"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {lastSaved ? formatTimeAgo(lastSaved) : ''}
            </span>
            
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {aiReply && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Companion</h2>
                <p className="text-gray-700 leading-relaxed">{aiReply}</p>
              </div>
            </div>
          </div>
        )}

        {selectedDate && (
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversation on {selectedDate}</h2>
                {loadingMessages && (
                  <div className="text-sm text-gray-500">Loading messages...</div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="text-sm text-gray-500">No messages yet for this date.</div>
                )}
                <ul className="space-y-3">
                  {messages.map((m) => (
                    <li key={m.id} className={m.role === 'assistant' ? 'text-blue-700' : 'text-gray-800'}>
                      <span className="font-medium capitalize">{m.role}:</span> {m.content}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Additional Support Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            This is a judgment-free zone. Your thoughts and feelings are valid.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}