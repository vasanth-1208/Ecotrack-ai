const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ecotrack_token');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ecotrack_token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ecotrack_token');
  }
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Network response was not ok');
  }

  // Handle PDF/binary downloads
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob() as any;
  }

  return response.json();
}

export const api = {
  auth: {
    register: (email: string, password: string, fullName: string) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      }),
    login: (email: string, password: string) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    demo: () =>
      apiRequest('/auth/demo', {
        method: 'POST',
      }),
    me: () => apiRequest('/auth/me'),
    updateBudget: (carbonBudget: number) =>
      apiRequest('/auth/budget', {
        method: 'PUT',
        body: JSON.stringify({ carbonBudget }),
      }),
  },
  footprint: {
    submit: (inputs: any) =>
      apiRequest('/footprint', {
        method: 'POST',
        body: JSON.stringify(inputs),
      }),
    getHistory: () => apiRequest('/footprint/history'),
  },
  predictions: {
    get: () => apiRequest('/predictions'),
  },
  goals: {
    create: (goalData: any) =>
      apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      }),
    list: () => apiRequest('/goals'),
    update: (id: string, currentValue: number) =>
      apiRequest(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ currentValue }),
      }),
  },
  gamification: {
    getChallenges: () => apiRequest('/gamification/challenges'),
    joinChallenge: (id: string) =>
      apiRequest(`/gamification/challenges/${id}/join`, { method: 'POST' }),
    logProgress: (id: string, progress: number) =>
      apiRequest(`/gamification/challenges/${id}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }),
    getLeaderboard: () => apiRequest('/gamification/leaderboard'),
    getBadges: () => apiRequest('/gamification/badges'),
  },
  ai: {
    getInsights: () => apiRequest('/ai/insights'),
    chat: (message: string, history: any[]) =>
      apiRequest('/ai/coach', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
    getReportDownloadUrl: () => {
      const token = getAuthToken();
      return `${API_BASE_URL}/ai/report?token=${token}`;
    },
    // We can also fetch as blob and trigger download client-side
    downloadReportBlob: () => apiRequest('/ai/report'),
  },
  offsets: {
    getRecommendations: () => apiRequest('/offsets'),
  },
  education: {
    getArticles: () => apiRequest('/education/articles'),
    readArticle: (id: string) =>
      apiRequest(`/education/articles/${id}/read`, { method: 'POST' }),
    getQuizzes: () => apiRequest('/education/quizzes'),
    submitQuiz: (id: string, score: number) =>
      apiRequest(`/education/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ score }),
      }),
  },
  simulator: {
    run: (inputs: any) =>
      apiRequest('/simulator', {
        method: 'POST',
        body: JSON.stringify(inputs),
      }),
  },
};
