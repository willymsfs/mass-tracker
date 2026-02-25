import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (data: {
    username: string;
    password: string;
    email?: string;
    name?: string;
    province?: string;
    congregation?: string;
    dateOfBirth?: string;
    dateOfOrdination?: string;
  }) => apiClient.post("/auth/register", data),
  login: (username: string, password: string) =>
    apiClient.post("/auth/login", { username, password }),
  getProfile: () => apiClient.get("/auth/profile"),
  updateProfile: (data: any) => apiClient.put("/auth/profile", data),
};

// Mass endpoints
export const massAPI = {
  // Blocked days
  createBlockedDay: (date: string, reason: string, reasonType?: string) =>
    apiClient.post("/mass/blocked-day", { date, reason, reasonType }),
  deleteBlockedDay: (id: string) => apiClient.delete(`/mass/blocked-day/${id}`),

  // Fixed intentions
  createFixedIntention: (data: any) =>
    apiClient.post("/mass/fixed-intention", data),
  deleteFixedIntention: (id: string) =>
    apiClient.delete(`/mass/fixed-intention/${id}`),

  // Deceased
  createDeceased: (data: any) => apiClient.post("/mass/deceased", data),
  deleteDeceased: (id: string) => apiClient.delete(`/mass/deceased/${id}`),

  // Batches
  createBatch: (data: any) => apiClient.post("/mass/batch", data),
  getBatchStatus: (batchId: string) =>
    apiClient.get(`/mass/batch-status/${batchId}`),

  // Calendar
  getCalendarMonth: (year: number, month: number) =>
    apiClient.get(`/mass/calendar/${year}/${month}`),
  getCalendarDay: (year: number, month: number, day: number) =>
    apiClient.get(`/mass/calendar/${year}/${month}/${day}`),

  // Scheduler
  runScheduler: (year: number) => apiClient.put("/mass/scheduler/run", { year }),
};

// Reports endpoints
export const reportsAPI = {
  getCanonicalRegister: (year: number) =>
    apiClient.get(`/reports/canonical-register/${year}`),
  getYearlyBook: (year: number) =>
    apiClient.get(`/reports/yearly-book/${year}`),
  getDeceasedSummary: (year: number) =>
    apiClient.get(`/reports/deceased-summary/${year}`),
  getMonthlyPersonal: (year: number) =>
    apiClient.get(`/reports/monthly-personal/${year}`),
};

export default apiClient;
