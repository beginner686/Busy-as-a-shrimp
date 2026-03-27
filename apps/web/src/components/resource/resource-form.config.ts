import type { ResourceType } from "@airp/api-types";
import { z } from "zod";

export type TagOption = {
  value: string;
  label: string;
};

export const skillOptions: TagOption[] = [
  { value: "短视频脚本", label: "短视频脚本" },
  { value: "探店拍摄", label: "探店拍摄" },
  { value: "直播运营", label: "直播运营" },
  { value: "AI剪辑", label: "AI剪辑" },
  { value: "平面设计", label: "平面设计" },
  { value: "达人对接", label: "达人对接" },
  { value: "品牌策划", label: "品牌策划" }
];

export const regionOptions: TagOption[] = [
  { value: "310000", label: "上海" },
  { value: "330100", label: "杭州" },
  { value: "440100", label: "广州" },
  { value: "110000", label: "北京" },
  { value: "320100", label: "南京" },
  { value: "440300", label: "深圳" }
];

export const commonCustomTagOptions: TagOption[] = [
  { value: "高转化", label: "高转化" },
  { value: "周末档期", label: "周末档期" },
  { value: "美食赛道", label: "美食赛道" },
  { value: "本地生活", label: "本地生活" },
  { value: "内容共创", label: "内容共创" }
];

export const resourceTypeOptions: Array<{ value: ResourceType; label: string }> = [
  { value: "skill", label: "技能" },
  { value: "location", label: "地点" },
  { value: "account", label: "账号" },
  { value: "time", label: "时间" }
];

const resourceFormSchemaBase = z.object({
  resourceType: z.enum(["skill", "location", "account", "time"]),
  skill: z.string().min(1, "请填写核心技能"),
  location: z.string().min(1, "请填写地点信息"),
  account: z.string().min(1, "请填写平台内账号标识"),
  time: z.string().min(1, "请填写可合作时间"),
  selectedSkills: z.array(z.string()).min(1, "至少选择 1 个技能标签"),
  selectedRegions: z.array(z.string()).min(1, "至少选择 1 个地区标签"),
  customTags: z.array(z.string()).max(20, "自定义标签最多 20 个"),
  notes: z.string().max(200, "补充说明最多 200 字"),
  priceMin: z.string().regex(/^\d+$/, "预算最小值需为非负整数"),
  priceMax: z.string().regex(/^\d+$/, "预算最大值需为非负整数")
});

export const resourceFormSchema = resourceFormSchemaBase.superRefine((value, ctx) => {
  const min = Number(value.priceMin);
  const max = Number(value.priceMax);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceMax"],
      message: "预算最大值需大于等于最小值"
    });
  }
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export const resourceFormDefaultValues: ResourceFormValues = {
  resourceType: "skill",
  skill: "",
  location: "",
  account: "",
  time: "",
  selectedSkills: ["短视频脚本"],
  selectedRegions: ["310000"],
  customTags: [],
  notes: "",
  priceMin: "500",
  priceMax: "3000"
};

export function getRegionLabelByCode(code: string): string {
  return regionOptions.find((region) => region.value === code)?.label ?? code;
}

export function buildUploadTags(values: ResourceFormValues): string[] {
  const tags = new Set<string>();

  for (const skill of values.selectedSkills) {
    tags.add(`skill:${skill}`);
  }

  for (const regionCode of values.selectedRegions) {
    tags.add(`region:${getRegionLabelByCode(regionCode)}`);
  }

  tags.add(`core_skill:${values.skill}`);
  tags.add(`core_location:${values.location}`);
  tags.add(`core_account:${values.account}`);
  tags.add(`core_time:${values.time}`);

  for (const customTag of values.customTags) {
    tags.add(customTag);
  }

  return Array.from(tags);
}
