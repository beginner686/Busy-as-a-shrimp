"use client";

import type { ResourceType } from "@airp/api-types";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { getResourceApi } from "../../../src/api";
import { useUserStore } from "../../../src/stores/user-store";
import { getErrorMessage } from "../../../src/utils/error-message";

const skillOptions = ["短视频脚本", "探店拍摄", "直播运营", "AI剪辑", "平面设计"];
const regionOptions = [
  { code: "310000", label: "上海" },
  { code: "330100", label: "杭州" },
  { code: "440100", label: "广州" },
  { code: "110000", label: "北京" }
];

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function containsPrivateContact(text: string): boolean {
  const normalized = text.replace(/\s+/g, "");
  return (
    /1\d{10}/.test(normalized) ||
    /wechat|vx|v信|微信/i.test(normalized) ||
    /qq/i.test(normalized) ||
    /@/.test(normalized)
  );
}

export default function ResourceNewPage() {
  const token = useUserStore((state) => state.getValidToken());
  const [resourceType, setResourceType] = useState<ResourceType>("skill");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [account, setAccount] = useState("");
  const [time, setTime] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["短视频脚本"]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["310000"]);
  const [customTagsInput, setCustomTagsInput] = useState("");
  const [priceMin, setPriceMin] = useState("500");
  const [priceMax, setPriceMax] = useState("3000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedRegionLabels = useMemo(
    () =>
      regionOptions
        .filter((region) => selectedRegions.includes(region.code))
        .map((region) => region.label),
    [selectedRegions]
  );

  if (!token) {
    return (
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
        <h1 className="text-2xl font-semibold text-slate-900">新建资源</h1>
        <p className="mt-2 text-sm text-slate-600">请先登录后再上传资源。</p>
        <Link
          href="/auth"
          className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-white"
        >
          去登录
        </Link>
      </section>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const values = [skill, location, account, time, customTagsInput].join(" ");
    if (containsPrivateContact(values)) {
      setError("检测到疑似私下联系方式，请改为平台内可审核描述。");
      return;
    }

    const customTags = customTagsInput
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const tags = [
      ...selectedSkills.map((item) => `skill:${item}`),
      ...selectedRegionLabels.map((item) => `region:${item}`),
      `core_skill:${skill}`,
      `core_location:${location}`,
      `core_account:${account}`,
      `core_time:${time}`,
      ...customTags
    ];

    const areaCode = selectedRegions[0];
    const min = Number(priceMin);
    const max = Number(priceMax);

    setSubmitting(true);
    try {
      const result = await getResourceApi().upload({
        resourceType,
        tags,
        areaCode,
        priceRange: {
          min: Number.isNaN(min) ? 0 : min,
          max: Number.isNaN(max) ? 0 : max
        }
      });
      setMessage(`资源上传成功：#${result.resourceId}，审核状态：${result.reviewStatus}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
      <h1 className="text-2xl font-semibold text-slate-900">新建资源</h1>
      <p className="mt-2 text-sm text-slate-600">遵循平台合规：禁止提交私下联系方式。</p>

      <form className="mt-6 space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">资源类型</span>
            <select
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value as ResourceType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <option value="skill">技能</option>
              <option value="location">地点</option>
              <option value="account">账号</option>
              <option value="time">时间</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">核心技能 (skill)</span>
            <input
              value={skill}
              onChange={(event) => setSkill(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="例：探店脚本策划"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">地点 (location)</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="例：上海徐汇"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">账号 (account)</span>
            <input
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="例：平台内账号ID，不填手机号微信"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">时间 (time)</span>
            <input
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              placeholder="例：周末晚间"
              required
            />
          </label>
        </div>

        <section>
          <h2 className="text-sm font-medium text-slate-700">技能标签选择器</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {skillOptions.map((option) => {
              const active = selectedSkills.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedSkills((prev) => toggleValue(prev, option))}
                  className={`rounded-full px-3 py-1 text-xs ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-700">地区标签选择器</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {regionOptions.map((region) => {
              const active = selectedRegions.includes(region.code);
              return (
                <button
                  key={region.code}
                  type="button"
                  onClick={() => setSelectedRegions((prev) => toggleValue(prev, region.code))}
                  className={`rounded-full px-3 py-1 text-xs ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">预算最小值</span>
            <input
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">预算最大值</span>
            <input
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">补充标签（逗号分隔）</span>
          <textarea
            value={customTagsInput}
            onChange={(event) => setCustomTagsInput(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            placeholder="例：探店,短视频,高转化"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "提交中..." : "提交资源"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
    </section>
  );
}
