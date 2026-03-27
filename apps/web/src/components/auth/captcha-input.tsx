"use client";

import { RefreshCw } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef
} from "react";

import { getUserApi } from "@/api";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface CaptchaInputRef {
  refreshCaptcha: () => Promise<void>;
}

type CaptchaInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  onCaptchaIdChange: (captchaId: string) => void;
};

function toImageSrc(imageBase64: string): string {
  if (imageBase64.startsWith("data:image/")) {
    return imageBase64;
  }

  if (imageBase64.trim().startsWith("<svg")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(imageBase64)}`;
  }

  // Base64 payload starting with "PHN2Zy" is usually "<svg"
  if (imageBase64.startsWith("PHN2Zy")) {
    return `data:image/svg+xml;base64,${imageBase64}`;
  }

  return `data:image/png;base64,${imageBase64}`;
}

export const CaptchaInput = forwardRef<CaptchaInputRef, CaptchaInputProps>(
  ({ value, onChange, onCaptchaIdChange, className, disabled, ...props }, ref) => {
    const [loading, setLoading] = useState(true);
    const [captchaImage, setCaptchaImage] = useState("");
    const [requestError, setRequestError] = useState("");
    const isFetchingRef = useRef(false);
    const onCaptchaIdChangeRef = useRef(onCaptchaIdChange);

    useEffect(() => {
      onCaptchaIdChangeRef.current = onCaptchaIdChange;
    }, [onCaptchaIdChange]);

    const requestCaptcha = useCallback(async () => {
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setRequestError("");
      try {
        const result = await getUserApi().fetchCaptcha();
        onCaptchaIdChangeRef.current(result.captchaId);
        setCaptchaImage(toImageSrc(result.imageBase64));
      } catch {
        onCaptchaIdChangeRef.current("");
        setCaptchaImage("");
        setRequestError("验证码加载失败，点击重试");
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        refreshCaptcha: requestCaptcha
      }),
      [requestCaptcha]
    );

    useEffect(() => {
      void requestCaptcha();
    }, [requestCaptcha]);

    return (
      <div className="grid grid-cols-[1fr_132px] gap-3">
        <Input
          {...props}
          className={className}
          disabled={disabled}
          maxLength={4}
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);
            onChange(next);
          }}
        />

        <button
          type="button"
          onClick={() => void requestCaptcha()}
          disabled={loading || disabled}
          className="relative flex h-11 items-center justify-center overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50/60 text-xs text-zinc-500 transition-all duration-200 hover:bg-zinc-100/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-80"
          aria-label="刷新图形验证码"
          title="点击刷新验证码"
        >
          {loading ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : captchaImage ? (
            <img src={captchaImage} alt="图形验证码" className="h-full w-full object-contain" />
          ) : (
            <span>{requestError || "加载失败"}</span>
          )}

          <span className="absolute right-1.5 top-1.5 rounded-md bg-white/80 p-0.5 shadow-sm">
            <RefreshCw className={`h-3 w-3 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
          </span>
        </button>
      </div>
    );
  }
);

CaptchaInput.displayName = "CaptchaInput";
