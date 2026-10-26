"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { AUTH_TOKEN_KEY, fetchCurrentUser, type AuthUser } from "@/services/api/auth";
import type { GatewayUser } from "@/services/api/device-auth";

type UserStore = {
    token: string;
    user: AuthUser | null;
    apiKey: string;
    aiGatewayBaseUrl: string;
    gatewayUser: GatewayUser | null;
    isReady: boolean;
    isLoading: boolean;
    setAdminSession: (token: string, user: AuthUser) => void;
    setGatewaySession: (apiKey: string, aiGatewayBaseUrl: string, gatewayUser: GatewayUser) => void;
    clearSession: () => void;
    hydrateUser: () => Promise<void>;
};

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            token: "",
            user: null,
            apiKey: "",
            aiGatewayBaseUrl: "",
            gatewayUser: null,
            isReady: false,
            isLoading: false,
            setAdminSession: (token, user) => set({ token, user, isReady: true }),
            setGatewaySession: (apiKey, aiGatewayBaseUrl, gatewayUser) => set({ apiKey, aiGatewayBaseUrl, gatewayUser, isReady: true }),
            clearSession: () => set({ token: "", user: null, apiKey: "", aiGatewayBaseUrl: "", gatewayUser: null, isReady: true }),
            hydrateUser: async () => {
                const token = get().token;
                if (!token) {
                    set({ user: null, isReady: true });
                    return;
                }
                set({ isLoading: true });
                try {
                    const user = await fetchCurrentUser(token);
                    if (user.role !== "admin") {
                        set({ token: "", user: null, isReady: true, isLoading: false });
                        return;
                    }
                    set({ user, isReady: true, isLoading: false });
                } catch {
                    set({ token: "", user: null, isReady: true, isLoading: false });
                }
            },
        }),
        {
            name: AUTH_TOKEN_KEY,
            partialize: (state) => ({ token: state.token, apiKey: state.apiKey, aiGatewayBaseUrl: state.aiGatewayBaseUrl, gatewayUser: state.gatewayUser }),
            onRehydrateStorage: () => (state) => {
                if (state) state.isReady = false;
            },
        },
    ),
);
