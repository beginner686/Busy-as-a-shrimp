"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  resourceTypeOptions,
  type ResourceFormValues
} from "@/components/resource/resource-form.config";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResourceBasicInfoFormProps = {
  form: UseFormReturn<ResourceFormValues>;
};

const inputClassName =
  "h-11 rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100";

export function ResourceBasicInfoForm({ form }: ResourceBasicInfoFormProps) {
  return (
    <section className="space-y-5 rounded-2xl bg-white/65 p-6 ring-1 ring-zinc-100">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">资源基础信息</h2>
        <p className="text-xs text-zinc-500">填写核心字段：技能、地点、账号、时间。</p>
      </header>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  资源类型
                </FormLabel>
                <FormDescription className="text-xs text-zinc-500">
                  选择最符合当前资源形态的类型。
                </FormDescription>
                <FormControl>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {resourceTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200",
                          field.value === option.value
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="skill"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  核心技能 (skill)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：探店脚本策划" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  地点 (location)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：上海徐汇" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  账号 (account)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：平台内账号ID" className={inputClassName} {...field} />
                </FormControl>
                <FormDescription className="text-xs text-zinc-500">
                  禁止填写手机号、微信、QQ、邮箱。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  时间 (time)
                </FormLabel>
                <FormControl>
                  <Input placeholder="例：周末晚间" className={inputClassName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="priceMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  预算最小值
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="500"
                    className={inputClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priceMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                  预算最大值
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="3000"
                    className={inputClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold tracking-tight text-zinc-900">
                补充说明（可选）
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="例：倾向本地生活赛道合作，需支持周末出镜。"
                  maxLength={200}
                  className="min-h-[112px] rounded-xl border border-transparent bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 transition-all duration-200 hover:bg-zinc-100/70 focus-visible:border-zinc-300 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-zinc-100"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs text-zinc-500">
                补充说明会参与合规校验，请勿填写私联信息。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
