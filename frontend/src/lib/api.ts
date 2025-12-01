import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


export type OnboardingPayload = {
  addiction: string;
  answers: any;
};

export async function saveOnboarding(payload: OnboardingPayload) {
  const { data } = await api.post(`/onboarding/`, payload);
  return data as {
    id: string;
    user_id: string;
    addiction: string;
    answers: any;
    created_at: string;
  };
}


// Daily tasks
export type DailyTaskItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  completed: boolean;
  video_url?: string | null;
  exercise_type?: string | null;
  difficulty?: string | null;
  image?: string | null;
  steps?: string[] | null; // Steps for physical exercises (3 steps from exercises.json)
  accuracy?: number | null; // Exercise accuracy score (0.0 to 1.0)
  exercise_id?: number | null; // ID from exercises.json - used for pose comparison
};

export type DailyTasksPlan = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  tasks: DailyTaskItem[];
  created_at: string;
};

export async function getDailyTasks(force?: boolean) {
  const { data } = await api.get(`/tasks/daily`, { params: { force } });
  return data as DailyTasksPlan;
}

// Task completion and accuracy APIs
export async function updateTaskCompletion(taskId: string, completed: boolean, date?: string) {
  const { data } = await api.patch(`/tasks/task/complete`, {
    task_id: taskId,
    completed,
    date,
  });
  return data as { success: boolean; message: string };
}

export async function updateTaskAccuracy(taskId: string, accuracy: number, date?: string) {
  const { data } = await api.patch(`/tasks/task/accuracy`, {
    task_id: taskId,
    accuracy,
    date,
  });
  return data as { success: boolean; message: string };
}

export async function markDayComplete(date?: string) {
  const { data } = await api.post(`/tasks/day/complete`, { date });
  return data as { success: boolean; message: string; tasks_completed: number };
}

