import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  // User data
  user: User | null;
  
  // Authentication status
  isAuthenticated: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Error message
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      error: null,
    }),

  setAuthenticated: (isAuthenticated) =>
    set({ isAuthenticated }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  logout: () =>
    set(initialState),
}));

export default useAuthStore;
