import { useEffect, useState } from 'react';
import api from '../lib/api';

type Props = {
  onSelectDate: (date: string) => void;
  selectedDate?: string | null;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  
  // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };
  
  return `${day}${getOrdinalSuffix(day)} ${month}`;
};

export default function JournalSideBar({ onSelectDate, selectedDate }: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchDates = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<string[]>('/journal/dates');
      setDates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('fetching dates');
    fetchDates();
  }, []);

  const handleCreateNewEntry = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    
    // Optimistically add today's date to the array if it doesn't exist
    if (!dates.includes(today)) {
      setDates((prevDates) => {
        // Add today's date and sort in reverse order (newest first)
        const updatedDates = [today, ...prevDates];
        return updatedDates.sort((a, b) => b.localeCompare(a));
      });
    }
    
    // Select today's date
    onSelectDate(today);
    
    // Refresh dates list to sync with backend, but preserve today's date if it was optimistically added
    fetchDates().then(() => {
      setDates((prevDates) => {
        // Ensure today's date is still in the list even if backend doesn't have it yet
        if (!prevDates.includes(today)) {
          const updatedDates = [today, ...prevDates];
          return updatedDates.sort((a, b) => b.localeCompare(a));
        }
        return prevDates;
      });
    });
  };

  return (
    <div className='w-64 h-[92vh] sticky top-[8vh] self-start bg-gray-100 shadow-2xl flex flex-col items-center gap-4 pt-4 overflow-y-auto'>
      <button 
        onClick={handleCreateNewEntry}
        className="bg-blue-500 cursor-pointer text-white rounded-full px-4 py-2 hover:bg-blue-600 transition-colors"
      >
        Create New Entry
      </button>

      <div className="w-full px-2">
        <h3 className="text-sm font-semibold text-gray-700 px-2">Your Entries</h3>
        {loading && (
          <div className="text-xs text-gray-500 px-2 py-2">Loading...</div>
        )}
        <ul className="mt-2 space-y-1">
          {dates.map((date) => (
            <li key={date}>
              <button
                onClick={() => onSelectDate(date)}
                className={`w-full cursor-pointer text-left px-3 py-2 rounded-md text-sm ${
                  selectedDate === date
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {formatDate(date)}
              </button>
            </li>
          ))}
          {!loading && dates.length === 0 && (
            <li className="text-xs text-gray-500 px-2 py-2">No entries yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
