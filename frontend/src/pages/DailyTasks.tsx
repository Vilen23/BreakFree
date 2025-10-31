import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { getDailyTasks, type DailyTaskItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Dummy task data
// const defaultTasks = [
//   {
//     id: 1,
//     title: "Morning Mindfulness",
//     description: "Take 10 minutes to breathe and set intentions",
//     time: "8:00 AM",
//     completed: false
//   },
//   {
//     id: 2,
//     title: "Hydration Check",
//     description: "Drink a glass of water and stretch",
//     time: "10:00 AM",
//     completed: false
//   },
//   {
//     id: 3,
//     title: "Write in Journal",
//     description: "Express your thoughts freely",
//     time: "12:00 PM",
//     completed: false
//   },
//   {
//     id: 4,
//     title: "Connect with Support",
//     description: "Text a friend or attend a meeting",
//     time: "3:00 PM",
//     completed: false
//   },
//   {
//     id: 5,
//     title: "Evening Reflection",
//     description: "Review your day with gratitude",
//     time: "8:00 PM",
//     completed: false
//   }
// ];

const TaskItem = ({ task, onToggle }: { task: DailyTaskItem, onToggle: (taskId: string) => void }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(String(task.id))}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            task.completed
              ? 'bg-gray-800 border-gray-800'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 text-white" />}
        </button>
        
        <div className="flex-1">
          <h3 className={`font-medium text-gray-900 ${task.completed ? 'line-through' : ''}`}>
            {task.title}
          </h3>
          <p className={`text-sm text-gray-600 mt-0.5 ${task.completed ? 'line-through' : ''}`}>
            {task.description}
          </p>
        </div>
        
        <span className="text-sm text-gray-500 flex-shrink-0">
          {task.time}
        </span>
      </div>
    </div>
  );
};

const DailyWellnessPlanner = () => {
  const { user } = useAuth();
  const [taskList, setTaskList] = useState<DailyTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dayCompleted, setDayCompleted] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const userId = user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const cacheKey = `daily_tasks:${userId}:${today}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { tasks: DailyTaskItem[] };
          console.log('[DailyTasks] using cached tasks', { userId, today, count: parsed.tasks.length });
          setTaskList(parsed.tasks);
          const completedFlag = localStorage.getItem(`${cacheKey}:completed`) === 'true';
          setDayCompleted(completedFlag || (parsed.tasks.length > 0 && parsed.tasks.every(t => t.completed)));
          setLoading(false);
          return;
        }
        const plan = await getDailyTasks();
        console.log('[DailyTasks] fetched plan from API', { date: plan.date, count: plan.tasks.length });
        setTaskList(plan.tasks as any[]);
        localStorage.setItem(cacheKey, JSON.stringify({ tasks: plan.tasks }));
        localStorage.setItem(`${cacheKey}:completed`, 'false');
        setDayCompleted(false);
      } catch {
        console.warn('[DailyTasks] failed to load tasks, falling back to empty');
        setTaskList([]);
        setDayCompleted(false);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleTask = (taskId: string) => {
    setTaskList(prev => {
      const updated = prev.map(task =>
        String(task.id) === String(taskId) ? { ...task, completed: !task.completed } : task
      );
      const today = new Date().toISOString().slice(0, 10);
      if (user?.id) {
        const cacheKey = `daily_tasks:${user.id}:${today}`;
        localStorage.setItem(cacheKey, JSON.stringify({ tasks: updated }));
        const nowCompleted = updated.length > 0 && updated.every(t => t.completed);
        localStorage.setItem(`${cacheKey}:completed`, nowCompleted ? 'true' : 'false');
        setDayCompleted(nowCompleted);
      }
      return updated;
    });
  };

  const completedCount = taskList.filter(task => task.completed).length;
  const totalCount = taskList.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const generateNewPlan = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!user?.id) return;
    const cacheKey = `daily_tasks:${user.id}:${today}`;
    try {
      setLoading(true);
      const plan = await getDailyTasks(true);
      console.log('[DailyTasks] forced new plan', { date: plan.date, count: plan.tasks.length });
      setTaskList(plan.tasks as any[]);
      localStorage.setItem(cacheKey, JSON.stringify({ tasks: plan.tasks }));
      localStorage.setItem(`${cacheKey}:completed`, 'false');
      setDayCompleted(false);
    } catch (e) {
      console.warn('[DailyTasks] failed to force-generate tasks', e);
    } finally {
      setLoading(false);
    }
  };

  const markDayComplete = () => {
    setTaskList(prev => {
      const updated = prev.map(task => ({ ...task, completed: true }));
      const today = new Date().toISOString().slice(0, 10);
      if (user?.id) {
        const cacheKey = `daily_tasks:${user.id}:${today}`;
        localStorage.setItem(cacheKey, JSON.stringify({ tasks: updated }));
        localStorage.setItem(`${cacheKey}:completed`, 'true');
      }
      setDayCompleted(true);
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Today's Plan</h1>
            <p className="text-gray-600">Loading your tasks…</p>
          </div>
          <div className="space-y-3">
            <div className="h-20 bg-white rounded-lg animate-pulse" />
            <div className="h-20 bg-white rounded-lg animate-pulse" />
            <div className="h-20 bg-white rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Today's Plan</h1>
          <p className="text-gray-600">Gentle steps for your day ahead</p>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Daily Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {dayCompleted && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6">
            <div className="font-semibold mb-1">You're doing great! 🎉</div>
            <div>Fantastic work completing your plan today. Come back tomorrow for a fresh set of supportive tasks.</div>
          </div>
        )}

        {/* Task List */}
        <div className="mb-6">
          {taskList.map(task => (
            <TaskItem key={task.id} task={task} onToggle={toggleTask} />
          ))}
        </div>

        {/* Action Buttons */}
        {!dayCompleted && (
          <div className="flex gap-3">
            <button
              onClick={generateNewPlan}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Generate New Plan
            </button>
            <button
              onClick={markDayComplete}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Mark Day Complete
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default DailyWellnessPlanner;