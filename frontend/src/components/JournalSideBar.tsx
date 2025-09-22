import { useEffect, useState } from 'react';
import api from '../lib/api';

type Props = {
  onSelectDate: (date: string) => void;
  selectedDate?: string | null;
};

export default function JournalSideBar({ onSelectDate, selectedDate }: Props) {
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
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
    fetchDates();
  }, []);

  return (
    <div className='w-1/8 h-[92vh] bg-gray-100 shadow-2xl flex flex-col items-center gap-4 pt-4 overflow-y-auto'>
      <button className="bg-blue-500 text-white rounded-full px-4 py-2 ">
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
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedDate === date
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {date}
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
