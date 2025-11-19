import { useEffect, useState, useRef } from 'react';
import {
  Check,
  Video,
  Sun,
  Moon,
  Clock,
  RefreshCw,
  CheckCircle2,
  Play
} from 'lucide-react';
import { getDailyTasks, type DailyTaskItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ExerciseMonitorModal from '../components/ExerciseMonitorModal';

/** tiny classnames helper used in your layout */
const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

export default function DailyWellnessPlanner() {
  const { user } = useAuth();

  // tasks state
  const [taskList, setTaskList] = useState<DailyTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dayCompleted, setDayCompleted] = useState<boolean>(false);

  // monitor modal
  const [selectedTask, setSelectedTask] = useState<DailyTaskItem | null>(null);
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState<boolean>(false);

  // ============================================================================
  // Loading Slideshow (isolated from main task logic)
  // ============================================================================

  const LOADING_SLIDES = [
    { image: '/Motivational1.png' },
    { image: '/Motivational2.png' },
    { image: '/Motivational3.png' },
    { image: '/Motivational4.png' },
  ] as const;

  // Slideshow configuration - separate and easily adjustable
  const SLIDESHOW_CONFIG = {
    enterDuration: 600,      // Transition animation duration (ms)
    holdDuration: 2500,      // Time each slide is visible (ms)
    initialDelay: 1500,      // Initial delay before starting (ms)
    cyclePause: 600,         // Pause between cycles (ms)
    domPaintDelay: 20,       // Small delay for DOM to paint (ms)
  };

  // Slideshow state (UI-facing)
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [nextSlideIndex, setNextSlideIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animStarted, setAnimStarted] = useState(false);

  // internal ref to track index for the loop (prevents effect re-trigger on index change)
  const slideshowIndexRef = useRef<number>(0);
  // abort ref for cleanup
  const slideshowAbortRef = useRef<{ aborted: boolean }>({ aborted: false });

  // Preload slide images (once)
  useEffect(() => {
    LOADING_SLIDES.forEach(slide => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  /**
   * Deterministic slideshow loop:
   * - Only depends on `loading` (start/stop).
   * - Manages its own index using slideshowIndexRef to avoid restarting multiple loops.
   */
  useEffect(() => {
    // start only when loading is true
    if (!loading) {
      // If we're leaving loading state, ensure slideshow UI state resets
      slideshowAbortRef.current.aborted = true;
      setIsTransitioning(false);
      setAnimStarted(false);
      setNextSlideIndex(null);
      return;
    }

    slideshowAbortRef.current.aborted = false;

    const {
      enterDuration,
      holdDuration,
      initialDelay,
      cyclePause,
      domPaintDelay
    } = SLIDESHOW_CONFIG;

    let running = true;

    async function loop() {
      // initial delay so first slide is visible
      await sleep(initialDelay);

      // start index from whatever currentSlideIndex is (sync state → ref)
      slideshowIndexRef.current = currentSlideIndex;

      while (!slideshowAbortRef.current.aborted && running) {
        const len = LOADING_SLIDES.length;
        const next = (slideshowIndexRef.current + 1) % len;

        // prepare next (off-screen right)
        setNextSlideIndex(next);
        setIsTransitioning(true);
        setAnimStarted(false);

        // small pause for DOM paint
        await sleep(domPaintDelay);

        // trigger CSS animation in next animation frame (double RAF to ensure transition is applied)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (slideshowAbortRef.current.aborted) return;
            setAnimStarted(true); // now current -> left and next -> center
          });
        });

        // wait for enter animation + hold
        await sleep(enterDuration + holdDuration);

        if (slideshowAbortRef.current.aborted) break;

        // finalize: commit next as current
        slideshowIndexRef.current = next;
        setCurrentSlideIndex(next);
        setNextSlideIndex(null);
        setIsTransitioning(false);
        setAnimStarted(false);

        // pause a bit before next cycle
        await sleep(cyclePause);
      }
    }

    void loop();

    return () => {
      // stop loop when loading flips or component unmounts
      running = false;
      slideshowAbortRef.current.aborted = true;
    };
    // IMPORTANT: only depend on `loading` so effect does NOT restart on every index change
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Tasks loading logic (caching + fetching) ---
  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const userId = user?.id;
      if (!userId) {
        setLoading(true);
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
        setTaskList(plan.tasks as DailyTaskItem[]);
        localStorage.setItem(cacheKey, JSON.stringify({ tasks: plan.tasks }));
        localStorage.setItem(`${cacheKey}:completed`, 'false');
        setDayCompleted(false);
      } catch (e) {
        console.warn('[DailyTasks] failed to load tasks, falling back to empty', e);
        setTaskList([]);
        setDayCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // toggle a task's completion and persist to localStorage
  const toggleTask = (taskId: string | number) => {
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

  const completedCount = taskList.filter(t => t.completed).length;
  const totalCount = taskList.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const generateNewPlan = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!user?.id) return;
    const cacheKey = `daily_tasks:${user.id}:${today}`;
    try {
      setLoading(true);
      const plan = await getDailyTasks(true);
      console.log('[DailyTasks] forced new plan', { date: plan.date, count: plan.tasks.length });
      setTaskList(plan.tasks as DailyTaskItem[]);
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
      const updated = prev.map(t => ({ ...t, completed: true }));
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

  const handleMonitorClick = (task: DailyTaskItem) => {
    setSelectedTask(task);
    setIsMonitorModalOpen(true);
  };

  const handleCloseMonitor = () => {
    setIsMonitorModalOpen(false);
    setSelectedTask(null);
  };

  // small helper to render time icon (keeps your new layout's behavior)
  const getTimeIcon = (time: string) => {
    switch (time) {
      case 'morning':
        return <Sun className="w-4 h-4" />;
      case 'afternoon':
        return <Sun className="w-4 h-4 text-orange-500" />;
      case 'evening':
        return <Moon className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // --- LOADING UI: show slideshow while tasks being fetched ---
  const currentSlide = LOADING_SLIDES[currentSlideIndex];
  const nextSlide = nextSlideIndex !== null ? LOADING_SLIDES[nextSlideIndex] : null;

  return (
    <div className="flex h-[92vh] mt-[8vh] w-full overflow-hidden bg-background font-sans">
      {/* Left Panel - Hero & Summary */}
      {/* Left panel will NOT render while loading */}
      {!loading && (
        <div className="relative hidden w-1/3 flex-col justify-between bg-[#0f172a] p-8 text-white lg:flex">
          {/* Decorative gradient blobs */}
          <div className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-900/20 blur-3xl" />
            <div className="absolute bottom-[10%] right-[10%] h-[300px] w-[300px] rounded-full bg-teal-800/10 blur-3xl" />
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <h2 className="text-lg font-medium text-teal-400">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Today's Plan</h1>
              <p className="mt-4 text-lg text-slate-300">Gentle steps for your day ahead. Focus on progress, not perfection.</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-3xl font-bold text-white">{Math.round(progress)}%</span>
                <span className="text-sm font-medium text-slate-400">{completedCount}/{totalCount} completed</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-teal-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <button
              onClick={generateNewPlan}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-4 text-sm font-semibold text-white transition-all hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-900/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180" />
              Generate New Plan
            </button>

            <button
              onClick={markDayComplete}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 py-4 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:text-white active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Day Complete
            </button>
          </div>
        </div>
      )}

      {/* Right Panel - Task Grid / Loading */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-6 lg:hidden bg-white border-b">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Today's Plan</h1>
            <p className="text-sm text-slate-500">{completedCount}/{totalCount} completed</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {loading ? (
            // Loading: show slideshow centered, outside the grid
            <div className="flex items-center justify-center min-h-full">
              <div className="group relative w-full max-w-4xl justify-center flex flex-col overflow-hidden rounded-2xl bg-white transition-all hover:shadow-lg hover:shadow-slate-200/50">
              <p className='text-slate-900 text-center text-2xl mb-1 '>Get <b>Motivated</b> while we load your tasks...</p>
                <div className="relative h-[720px] w-full overflow-hidden bg-slate-100">
                    {/* Current slide */}
                    <img
                      key={`cur-${currentSlideIndex}`}
                      src={currentSlide.image}
                      alt="Motivational"
                      className="absolute inset-0 w-full h-full object-cover will-change-transform"
                      style={{
                        transform: isTransitioning && animStarted ? 'translateX(-100%)' : 'translateX(0)',
                        transition: `transform ${SLIDESHOW_CONFIG.enterDuration}ms ease-in-out`,
                        zIndex: 2,
                      }}
                    />

                    {/* Next slide */}
                    {isTransitioning && nextSlide && (
                      <img
                        key={`next-${nextSlideIndex}`}
                        src={nextSlide.image}
                        alt="Next motivational"
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        style={{
                          transform: animStarted ? 'translateX(0)' : 'translateX(100%)',
                          transition: `transform ${SLIDESHOW_CONFIG.enterDuration}ms ease-in-out`,
                          zIndex: animStarted ? 3 : 1,
                        }}
                      />
                    )}
                    </div>
                  </div>
                </div>
          ) : (
            // Not loading: render actual tasks in your new card layout
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2 max-w-5xl mx-auto">
              {taskList.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-lg hover:shadow-slate-200/50',
                    task.completed ? 'border-teal-200 bg-teal-50/30' : 'border-slate-100 shadow-sm'
                  )}
                >
                  {/* Image */}
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                    <img
                      src={(task as any).image || '/placeholder.svg'}
                      alt={task.title}
                      className={cn(
                        'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105',
                        task.completed && 'grayscale opacity-80'
                      )}
                    />
                    <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm flex items-center gap-1.5">
                      {getTimeIcon(task.time)}
                      <span className="capitalize">{task.time}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <h3
                        className={cn(
                          'font-semibold text-lg leading-tight transition-colors',
                          task.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'
                        )}
                      >
                        {task.title}
                      </h3>

                      <button
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all cursor-pointer',
                          task.completed ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 text-transparent hover:border-teal-500'
                        )}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>

                    <p className={cn('mt-2 text-sm text-slate-500 line-clamp-3', task.completed && 'opacity-70')}>
                      {task.description}
                    </p>

                    {(task.exercise_type === 'physical' || (task as any).video_url) && !task.completed && (
                      <div className="mt-auto pt-4">
                        <button
                          onClick={() => handleMonitorClick(task)}
                          className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Monitor Exercise
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Bottom Actions */}
        <div className="border-t bg-white p-4 lg:hidden">
          <button
            onClick={generateNewPlan}
            className="w-full rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white cursor-pointer"
          >
            Generate New Plan
          </button>
        </div>
      </div>

      {/* Exercise Monitor Modal */}
      {selectedTask && (
        <ExerciseMonitorModal task={selectedTask} isOpen={isMonitorModalOpen} onClose={handleCloseMonitor} />
      )}
    </div>
  );
}
