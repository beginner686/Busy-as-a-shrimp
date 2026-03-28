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
import { cn } from "@/lib/utils";

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
          className={cn(
            "h-11 rounded-xl border border-white/5 bg-black/40 px-4 text-zinc-100 placeholder:text-zinc-600 transition-all duration-300 hover:bg-black/60 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]",
            className
          )}
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
          className="relative flex h-11 items-center justify-center overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10 transition-all duration-300 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="刷新图形验证码"
          title="点击刷新验证码"
        >
          {loading ? (
            <Skeleton className="h-full w-full rounded-none bg-white/5" />
          ) : captchaImage ? (
            <img src={captchaImage} alt="图形验证码" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-[10px] text-zinc-500">{requestError || "加载失败"}</span>
          )}

          <span className="absolute right-1 top-1 rounded-md bg-white/[0.03] p-0.5 ring-1 ring-white/[0.05]">
            <RefreshCw className={`h-2.5 w-2.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
          </span>
        </button>
      </div>
    );
  }
);

CaptchaInput.displayName = "CaptchaInput";
