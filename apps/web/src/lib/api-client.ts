"use client";

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { loadClientEnv } from "../config/env";
import { useUserStore } from "../stores/user-store";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function readCookieToken(cookieKey: string): string {
  if (typeof document === "undefined") {
    return "";
  }
  const chunks = document.cookie.split(";").map((item) => item.trim());
  const found = chunks.find((item) => item.startsWith(`${cookieKey}=`));
  if (!found) {
    return "";
  }
  return decodeURIComponent(found.split("=")[1] ?? "");
}

function attachAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const tokenFromStore = useUserStore.getState().getValidToken();
  const tokenFromCookie = readCookieToken("airp_token");
  const token = tokenFromStore || tokenFromCookie;

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;
}

function normalizeError(error: unknown): never {
  const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
  const message = axiosError.response?.data?.message || axiosError.message || "请求失败";
  throw new Error(message);
}

function extractPayload<T>(responseData: ApiEnvelope<T> | T): T {
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "success" in responseData &&
    "data" in responseData
  ) {
    const envelope = responseData as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new Error(envelope.message || "请求失败");
    }
    return envelope.data;
  }
  return responseData as T;
}

function createApiClient(): AxiosInstance {
  const env = loadClientEnv();
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: 15000
  });

  client.interceptors.request.use(attachAuthHeader);
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        useUserStore.getState().logout();
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`;
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const clientSingleton = createApiClient();

export const apiClient = {
  async get<T>(path: string, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.get<ApiEnvelope<T> | T>(path, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  },
  async post<T>(path: string, payload?: unknown, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.post<ApiEnvelope<T> | T>(path, payload, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  },
  async put<T>(path: string, payload?: unknown, config?: Record<string, unknown>): Promise<T> {
    try {
      const response = await clientSingleton.put<ApiEnvelope<T> | T>(path, payload, config);
      return extractPayload(response.data);
    } catch (error) {
      normalizeError(error);
    }
  }
};
