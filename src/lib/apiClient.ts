/**
 * Unified, bulletproof API client for Kacha Bazar.
 * 
 * Guarantees:
 * 1. Checks HTTP status and Content-Type before parsing.
 * 2. Parses JSON ONLY when response is valid JSON (Content-Type: application/json).
 * 3. Never throws "Unexpected token '<', <html>..." when HTML or text is returned by server.
 * 4. Translates HTTP and server errors into clear, user-friendly Bangla & English messages.
 * 5. Automatically injects staff/admin session authentication headers.
 * 6. Logs real API errors in development mode for easy debugging.
 */

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: any;
  public isHtmlResponse: boolean;
  public url: string;

  constructor(options: {
    message: string;
    status: number;
    statusText: string;
    data?: any;
    isHtmlResponse?: boolean;
    url?: string;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.data = options.data;
    this.isHtmlResponse = options.isHtmlResponse || false;
    this.url = options.url || "";
  }
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

/**
 * Returns authentication headers for Staff/Admin API calls.
 */
export function getApiAuthHeaders(user?: any): Record<string, string> {
  const headers: Record<string, string> = {};

  try {
    const sessionId = user?.sessionId ||
      (typeof window !== "undefined"
        ? (localStorage.getItem("kb_staff_session") || sessionStorage.getItem("kb_staff_session"))
        : null);

    if (sessionId) {
      headers["Authorization"] = `Bearer ${sessionId}`;
      headers["x-session-id"] = sessionId;
    }

    const email = user?.email ||
      (typeof window !== "undefined" ? (localStorage.getItem("kb_staff_email") || localStorage.getItem("kb_user_email")) : null);
    if (email) {
      headers["x-user-email"] = email;
    }

    const staffId = user?.staffId || user?.uid ||
      (typeof window !== "undefined" ? localStorage.getItem("kb_staff_id") : null);
    if (staffId) {
      headers["x-staff-id"] = staffId;
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return headers;
}

/**
 * Friendly localized error message generator based on HTTP status
 */
function getStatusErrorMessage(status: number, statusText: string, path: string): string {
  switch (status) {
    case 400:
      return "অনুরোধটি সঠিক নয়। অনুগ্রহ করে তথ্য পুনরায় যাচাই করুন।";
    case 401:
      return "অননুমোদিত অনুরোধ। সেশনের মেয়াদ শেষ হয়েছে, অনুগ্রহ করে আবার লগইন করুন।";
    case 403:
      return "আপনার এই কার্যটি সম্পাদনের প্রশাসনিক অনুমতি নেই (Forbidden)।";
    case 404:
      return `অনুরোধকৃত API সেবাটি সার্ভারে পাওয়া যায়নি (404 Not Found: ${path})।`;
    case 405:
      return "অনুরোধ পদ্ধতি সার্ভারে সমর্থিত নয় (Method Not Allowed)।";
    case 409:
      return "তথ্যের অসঙ্গতি বা ডুপ্লিকেট রেকর্ড পাওয়া গেছে (Conflict)।";
    case 429:
      return "অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।";
    case 500:
      return "সার্ভারে অভ্যন্তরীণ সমস্যা দেখা দিয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।";
    case 502:
    case 503:
    case 504:
      return "সার্ভার সাময়িকভাবে অনুপলব্ধ রয়েছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
    default:
      return `অনুরোধ সম্পন্ন করা যায়নি (${status} ${statusText || "Error"})`;
  }
}

/**
 * Core universal request function
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeoutMs = 25000, skipAuth = false, headers: customHeaders, body, ...restOptions } = options;

  // Build headers
  const headers = new Headers();

  // Add default content-type for non-FormData
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }

  // Attach auth headers unless skipped
  if (!skipAuth) {
    const authHeaders = getApiAuthHeaders();
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value) headers.set(key, value);
    }
  }

  // Merge custom headers
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((val, key) => headers.set(key, val));
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, val]) => headers.set(key, val));
    } else {
      for (const [key, val] of Object.entries(customHeaders)) {
        if (val !== undefined && val !== null) headers.set(key, String(val));
      }
    }
  }

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body,
      signal: controller.signal
    });
  } catch (networkErr: any) {
    clearTimeout(timeoutId);
    if (networkErr?.name === "AbortError") {
      throw new ApiError({
        message: "সার্ভার থেকে সাড়া পেতে বেশি সময় লেগেছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
        status: 408,
        statusText: "Request Timeout",
        url
      });
    }
    throw new ApiError({
      message: networkErr?.message || "নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে। সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।",
      status: 0,
      statusText: "Network Error",
      url
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // Inspect Content-Type
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml+xml");

  let parsedData: any = null;
  let rawText = "";

  try {
    rawText = await response.text();
  } catch (textErr) {
    rawText = "";
  }

  if (isJson && rawText) {
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      // JSON parsing failed unexpectedly despite JSON content type
      parsedData = null;
    }
  }

  // If response is NOT OK
  if (!response.ok) {
    let errorMessage = "";

    if (parsedData && typeof parsedData === "object") {
      errorMessage = parsedData.message || parsedData.error || "";
    }

    if (!errorMessage) {
      if (isHtml) {
        errorMessage = getStatusErrorMessage(response.status, response.statusText, url);
      } else if (rawText && rawText.length < 200 && !rawText.includes("<")) {
        errorMessage = rawText.trim();
      } else {
        errorMessage = getStatusErrorMessage(response.status, response.statusText, url);
      }
    }

    if (import.meta.env?.DEV) {
      console.error(`[API Error ${response.status}] ${options.method || "GET"} ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        contentType,
        parsedData,
        rawText: rawText.slice(0, 300)
      });
    }

    throw new ApiError({
      message: errorMessage,
      status: response.status,
      statusText: response.statusText,
      data: parsedData,
      isHtmlResponse: isHtml,
      url
    });
  }

  // Response IS OK (200-299)
  if (parsedData !== null) {
    return parsedData as T;
  }

  // If status is 204 No Content
  if (response.status === 204 || !rawText) {
    return { success: true } as unknown as T;
  }

  // If response returned HTML on a 200 OK (e.g. Vite SPA fallback for a missing API route)
  if (isHtml || rawText.trim().startsWith("<")) {
    const errorMsg = `API রুটটি সার্ভারে সংজ্ঞায়িত নেই (HTML ইন্টারফেস প্রাপ্ত হয়েছে: ${url})`;
    if (import.meta.env?.DEV) {
      console.warn(`[API Warning] Received HTML response on 200 OK for API route ${url}`);
    }
    throw new ApiError({
      message: errorMsg,
      status: 404,
      statusText: "Not Found (HTML SPA Fallback)",
      data: null,
      isHtmlResponse: true,
      url
    });
  }

  return { success: true, text: rawText } as unknown as T;
}

/**
 * Convenience HTTP helper methods
 */
export const apiClient = {
  get: <T = any>(url: string, options?: Omit<ApiRequestOptions, "method">) =>
    apiRequest<T>(url, { ...options, method: "GET" }),

  post: <T = any>(url: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(url, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),

  put: <T = any>(url: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(url, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),

  delete: <T = any>(url: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(url, {
      ...options,
      method: "DELETE",
      body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined
    }),

  request: apiRequest
};

export default apiClient;
