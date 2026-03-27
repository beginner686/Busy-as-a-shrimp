"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  resourceTypeOptions,
  type ResourceFormValues
} from "@/components/resource/resource-form.config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ResourceBasicInfoForm({ form }: ResourceBasicInfoFormProps) {
  return (
    <Card className="border-border/70 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle>资源基础信息</CardTitle>
        <CardDescription>填写核心字段：技能、地点、账号、时间。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="resourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>资源类型</FormLabel>
                <FormControl>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                  >
                    {resourceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                <FormLabel>核心技能 (skill)</FormLabel>
                <FormControl>
                  <Input placeholder="例：探店脚本策划" {...field} />
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
                <FormLabel>地点 (location)</FormLabel>
                <FormControl>
                  <Input placeholder="例：上海徐汇" {...field} />
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
                <FormLabel>账号 (account)</FormLabel>
                <FormControl>
                  <Input placeholder="例：平台内账号ID" {...field} />
                </FormControl>
                <FormDescription>禁止填写手机号、微信、QQ、邮箱。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>时间 (time)</FormLabel>
                <FormControl>
                  <Input placeholder="例：周末晚间" {...field} />
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
                <FormLabel>预算最小值</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="500" {...field} />
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
                <FormLabel>预算最大值</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="3000" {...field} />
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
              <FormLabel>补充说明（可选）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="例：倾向本地生活赛道合作，需支持周末出镜。"
                  maxLength={200}
                  {...field}
                />
              </FormControl>
              <FormDescription>补充说明会参与合规校验，请勿填写私联信息。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
