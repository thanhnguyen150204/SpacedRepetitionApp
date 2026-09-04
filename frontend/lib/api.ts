import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Auth ────────────────────────────────────────────────
export const registerUser = (data: any) => api.post('/auth/register', data).then(r => r.data);
export const loginUser = (data: any) => api.post('/auth/login', data).then(r => r.data);
export const getMe = () => api.get('/auth/me').then(r => r.data);

// ─── Decks ───────────────────────────────────────────────
export const getDecks = () => api.get('/decks').then(r => r.data);
export const getDeck = (id: string) => api.get(`/decks/${id}`).then(r => r.data);
export const createDeck = (data: any) => api.post('/decks', data).then(r => r.data);
export const updateDeck = (id: string, data: any) => api.put(`/decks/${id}`, data).then(r => r.data);
export const deleteDeck = (id: string) => api.delete(`/decks/${id}`).then(r => r.data);

// ─── Cards ───────────────────────────────────────────────
export const getCards = (deckId: string) => api.get(`/decks/${deckId}/cards`).then(r => r.data);
export const createCard = (deckId: string, data: any) => api.post(`/decks/${deckId}/cards`, data).then(r => r.data);
export const bulkCreateCards = (deckId: string, cards: any[]) =>
  api.post(`/decks/${deckId}/cards/bulk`, { cards }).then(r => r.data);
export const updateCard = (deckId: string, cardId: string, data: any) =>
  api.put(`/decks/${deckId}/cards/${cardId}`, data).then(r => r.data);
export const deleteCard = (deckId: string, cardId: string) =>
  api.delete(`/decks/${deckId}/cards/${cardId}`).then(r => r.data);

// ─── Review (SM-2) ───────────────────────────────────────
export const getDueCards = (deckId?: string) =>
  api.get('/review/due', { params: deckId ? { deckId } : {} }).then(r => r.data);
export const submitReview = (data: { cardId: string; quality: number; responseTimeMs?: number; sessionId?: string }) =>
  api.post('/review/submit', data).then(r => r.data);
export const getStats = () => api.get('/review/stats').then(r => r.data);
export const resetCard = (cardId: string) => api.post(`/review/reset/${cardId}`).then(r => r.data);

// ─── Sessions ────────────────────────────────────────────
export const startSession = (deckId: string, sessionType: string) =>
  api.post('/sessions/start', { deckId, sessionType }).then(r => r.data);
export const endSession = (id: string, cardsCorrect: number, cardsWrong: number) =>
  api.put(`/sessions/${id}/end`, { cardsCorrect, cardsWrong }).then(r => r.data);

// ─── Questions ───────────────────────────────────────────
export const getQuestions = (deckId: string, limit = 20) =>
  api.get(`/questions/${deckId}`, { params: { limit } }).then(r => r.data);
export const generateQuestions = (deckId: string) =>
  api.post(`/questions/generate/${deckId}`).then(r => r.data);

// ─── OCR ─────────────────────────────────────────────────
export const uploadOcr = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/ocr/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export default api;
