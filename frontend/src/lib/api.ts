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

