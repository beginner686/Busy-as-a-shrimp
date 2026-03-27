"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { TagOption } from "@/components/resource/resource-form.config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

type TagSelectorFieldProps = {
  label: string;
  description?: string;
  placeholder?: string;
  options: TagOption[];
  commonValues?: string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
};

export function TagSelectorField({
  label,
  description,
  placeholder,
  options,
  commonValues,
  value,
  onChange,
  allowCustom = true
}: TagSelectorFieldProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);
  const optionMap = useMemo(() => {
    const map = new Map<string, TagOption>();
    for (const option of options) {
      map.set(option.value, option);
    }
    return map;
  }, [options]);

  const commonOptions = useMemo(() => {
    if (!commonValues || commonValues.length === 0) {
      return [] as TagOption[];
    }
    return commonValues
      .map((item) => optionMap.get(item) ?? { value: item, label: item })
      .filter((item, index, arr) => arr.findIndex((v) => v.value === item.value) === index);
  }, [commonValues, optionMap]);

  const normalizedSearch = normalizeTag(searchTerm).toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options.filter((option) => !selectedSet.has(option.value)).slice(0, 12);
    }

    return options
      .filter((option) => {
        if (selectedSet.has(option.value)) {
          return false;
        }
        return (
          option.label.toLowerCase().includes(normalizedSearch) ||
          option.value.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 12);
  }, [normalizedSearch, options, selectedSet]);

  const canCreateCustom = useMemo(() => {
    if (!allowCustom) {
      return false;
    }
    const next = normalizeTag(searchTerm);
    if (!next) {
      return false;
    }
    return !value.some((tag) => tag.toLowerCase() === next.toLowerCase());
  }, [allowCustom, searchTerm, value]);

  function toggleTag(tag: string) {
    if (selectedSet.has(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    onChange([...value, tag]);
  }

  function addCustomTag() {
    const next = normalizeTag(searchTerm);
    if (!next) {
      return;
    }

    if (value.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setSearchTerm("");
      return;
    }

    onChange([...value, next]);
    setSearchTerm("");
  }

  return (
    <Card className="border-border/70 bg-white/70 shadow-sm backdrop-blur">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {value.length === 0 ? (
            <span className="text-xs text-muted-foreground">尚未选择标签</span>
          ) : (
            value.map((tag) => {
              const displayLabel = optionMap.get(tag)?.label ?? tag;
              return (
                <Badge key={tag} variant="secondary" className="gap-1 rounded-full px-3 py-1">
                  {displayLabel}
                  <button
                    type="button"
                    aria-label={`删除标签 ${displayLabel}`}
                    onClick={() => toggleTag(tag)}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={placeholder ?? "搜索并添加标签"}
              className="pl-9"
            />
          </div>
          {allowCustom ? (
            <Button
              type="button"
              variant="outline"
              onClick={addCustomTag}
              disabled={!canCreateCustom}
            >
              添加自定义
            </Button>
          ) : null}
        </div>

        {commonOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              常用标签
            </p>
            <div className="flex flex-wrap gap-2">
              {commonOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={selectedSet.has(option.value) ? "default" : "secondary"}
                  onClick={() => toggleTag(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            搜索结果
          </p>
          {filteredOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              未找到更多可选标签，尝试输入自定义标签。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleTag(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
