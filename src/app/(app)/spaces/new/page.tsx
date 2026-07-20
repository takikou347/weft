"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createGroup, type SpaceFormState } from "../actions";

const initialState: SpaceFormState = { error: null };

export default function NewSpacePage() {
  const [state, formAction, pending] = useActionState(createGroup, initialState);

  return (
    <div>
      <h2 className="font-serif text-2xl">新しいスペース</h2>
      <p className="mt-1 text-sm text-usuzumi">
        共有した記録だけが、メンバーに見えます。
      </p>

      <form
        action={formAction}
        className="mt-6 rounded-md border border-keisen bg-paper px-6 py-8"
      >
        <fieldset>
          <legend className="text-sm">種類</legend>
          <div className="mt-1 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="group"
                defaultChecked
                className="accent-ai"
              />
              グループ(友だち・家族・サークル)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="organization"
                className="accent-ai"
              />
              組織(チームの仕事場。配下にプロジェクトを持てます)
            </label>
          </div>
        </fieldset>

        <label className="mt-6 block text-sm" htmlFor="name">
          スペース名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={50}
          placeholder="例: 山の会、田中家"
          className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />

        {state.error && (
          <p role="alert" className="mt-4 text-sm text-ai-deep">
            {state.error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/spaces"
            className="text-sm text-usuzumi underline underline-offset-4"
          >
            戻る
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ai px-6 py-3 text-paper transition-colors hover:bg-ai-deep disabled:opacity-50"
          >
            {pending ? "作成しています…" : "作成する"}
          </button>
        </div>
      </form>
    </div>
  );
}
