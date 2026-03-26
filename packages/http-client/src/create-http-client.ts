import type { ApiResponse } from "@airp/api-types";
import { HttpClientError } from "./errors";

export interface HttpClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
  onAuthExpired?: () => void;
}

interface HttpRequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  cache?: RequestCache;
}

interface HttpClient {
  get<T>(path: string, options?: Omit<HttpRequestOptions, "body">): Promise<T>;
  post<T>(path: string, options?: HttpRequestOptions): Promise<T>;
  put<T>(path: string, options?: HttpRequestOptions): Promise<T>;
  delete<T>(path: string, options?: Omit<HttpRequestOptions, "body">): Promise<T>;
}

function isApiResponse(payload: unknown): payload is ApiResponse<unknown> {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "message" in payload &&
    "data" in payload
  );
}

function makeUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function mapErrorCode(status: number, message?: string): HttpClientError["code"] {
  const normalizedMessage = (message ?? "").toLowerCase();

  if (
    status === 401 ||
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return "AUTH_EXPIRED";
  }

  if (
    status === 429 ||
    normalizedMessage.includes("too many") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "RATE_LIMITED";
  }

  if (status >= 500) {
    return "SERVER_ERROR";
  }

  if (status >= 400) {
    return "HTTP_ERROR";
  }

  return "BUSINESS_ERROR";
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    config?: HttpRequestOptions
  ): Promise<T> {
    const response = await fetcher(makeUrl(options.baseUrl, path), {
      method,
      cache: config?.cache ?? "no-store",
      headers: {
        "Content-Type": "application/json",
        ...config?.headers
      },
      body: config?.body === undefined ? undefined : JSON.stringify(config.body)
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        options.onAuthExpired?.();
      }
      const payloadMessage =
        typeof payload === "object" && payload !== null && "message" in payload
          ? String(payload.message)
          : undefined;
      throw new HttpClientError(
        mapErrorCode(response.status, payloadMessage),
        `HTTP_${response.status}`,
        response.status,
        payload
      );
    }

    if (!isApiResponse(payload)) {
      throw new HttpClientError(
        "INVALID_API_RESPONSE",
        "INVALID_API_RESPONSE",
        response.status,
        payload
      );
    }

    if (!payload.success) {
      const code = mapErrorCode(response.status, payload.message);
      throw new HttpClientError(
        code,
        payload.message || "API_BUSINESS_ERROR",
        response.status,
        payload.data
      );
    }

    return payload.data as T;
  }

  return {
    get<T>(path: string, requestOptions?: Omit<HttpRequestOptions, "body">): Promise<T> {
      return request<T>("GET", path, requestOptions);
    },
    post<T>(path: string, requestOptions?: HttpRequestOptions): Promise<T> {
      return request<T>("POST", path, requestOptions);
    },
    put<T>(path: string, requestOptions?: HttpRequestOptions): Promise<T> {
      return request<T>("PUT", path, requestOptions);
    },
    delete<T>(path: string, requestOptions?: Omit<HttpRequestOptions, "body">): Promise<T> {
      return request<T>("DELETE", path, requestOptions);
    }
  };
}
