"use client";

import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import type { DataExtractPreset } from "./data-extract-types";

const barStyle = {
  borderColor: "var(--border-default)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-secondary)",
};
const primaryBtnStyle = {
  background: "linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)",
};

export function PresetBar({
  presets,
  currentPresetId,
  onSelectPreset,
  onSaveCurrent,
}: {
  presets: DataExtractPreset[];
  currentPresetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onSaveCurrent: (name: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const currentPreset = presets.find((p) => p.id === currentPresetId);
  const displayLabel = currentPreset ? currentPreset.name : "프리셋 선택";

  const handleSave = () => {
    const name = saveName.trim() || "저장된 설정";
    onSaveCurrent(name);
    setSaveName("");
    setSaveOpen(false);
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
      style={barStyle}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-w-[180px] justify-between"
          style={barStyle}
        >
          <span style={{ color: "var(--text-primary)" }}>{displayLabel}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setDropdownOpen(false)}
            />
            <div
              className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg"
              style={{
                borderColor: "var(--border-default)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectPreset(null);
                  setDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-subtle)]"
                style={{ color: "var(--text-primary)" }}
              >
                기본 (선택 안 함)
              </button>
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectPreset(p.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-subtle)]"
                  style={{
                    color: currentPresetId === p.id ? "var(--color-primary-600)" : "var(--text-primary)",
                    fontWeight: currentPresetId === p.id ? 600 : 400,
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setSaveOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
        style={barStyle}
      >
        <Save className="h-4 w-4" />
        현재 설정 저장
      </button>
      {saveOpen && (
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="프리셋 이름"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--border-default)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
            style={primaryBtnStyle}
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => { setSaveOpen(false); setSaveName(""); }}
            className="rounded-lg border px-3 py-2 text-sm font-medium"
            style={barStyle}
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
