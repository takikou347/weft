"use client";

import { useActionState } from "react";
import { updateSpaceSettings, type SpaceFormState } from "../../actions";

const initialState: SpaceFormState = { error: null };

// 差し色の候補(和色)。1スペースにつき1色(CLAUDE.mdデザイン原則)
const COLOR_CHOICES = [
  { value: "#3f5d7d", label: "藍" },
  { value: "#7d3f4b", label: "蘇芳" },
  { value: "#4b6b3f", label: "松葉" },
  { value: "#7d6a3f", label: "芥子" },
  { value: "#5d3f7d", label: "江戸紫" },
  { value: "#3f7d74", label: "青碧" },
];

export function SettingsForm({
  spaceId,
  currentName,
  currentColor,
}: {
  spaceId: string;
  currentName: string;
  currentColor: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateSpaceSettings,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="border border-keisen bg-paper px-6 py-8"
    >
      <input type="hidden" name="space_id" value={spaceId} />

      <label className="block text-sm" htmlFor="name">
        名前
      </label>
      <input
        id="name"
        name="name"
        type="text"
        required
        maxLength={50}
        defaultValue={currentName}
        className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none focus:border-ai"
      />

      <fieldset className="mt-6">
        <legend className="text-sm">しるしの色</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {COLOR_CHOICES.map((c) => (
            <label key={c.value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="color"
                value={c.value}
                defaultChecked={c.value === currentColor}
                className="accent-ai"
              />
              <span
                aria-hidden
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: c.value }}
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="mt-4 text-sm text-ai-deep">
          {state.error}
        </p>
      )}

      <div className="mt-8 text-right">
        <button
          type="submit"
          disabled={pending}
          className="bg-ai px-6 py-3 text-paper transition-colors hover:bg-ai-deep disabled:opacity-50"
        >
          {pending ? "しまっています…" : "この設定でしまう"}
        </button>
      </div>
    </form>
  );
}
