"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDiaryItem, type ItemFormState } from "../actions";
import { todayIso } from "@/lib/date";

const initialState: ItemFormState = { error: null };

export default function NewItemPage() {
  const [state, formAction, pending] = useActionState(
    createDiaryItem,
    initialState,
  );

  return (
    <div>
      <h2 className="font-serif text-2xl">記す</h2>
      <p className="mt-1 text-sm text-usuzumi">
        記したことは、あなたにしか見えません。
      </p>

      <form
        action={formAction}
        className="mt-6 border border-keisen bg-paper px-6 py-8"
      >
        <label className="block text-sm" htmlFor="occurred_on">
          日付
        </label>
        <input
          id="occurred_on"
          name="occurred_on"
          type="date"
          required
          defaultValue={todayIso()}
          className="mt-1 border-b border-keisen bg-transparent py-2 outline-none focus:border-ai"
        />

        <label className="mt-6 block text-sm" htmlFor="title">
          題(なくてもかまいません)
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none focus:border-ai"
        />

        <label className="mt-6 block text-sm" htmlFor="body">
          本文
        </label>
        <textarea
          id="body"
          name="body"
          rows={8}
          className="mt-1 w-full resize-y border border-keisen bg-transparent px-3 py-2 leading-relaxed outline-none focus:border-ai"
        />

        {state.error && (
          <p role="alert" className="mt-4 text-sm text-ai-deep">
            {state.error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-usuzumi underline underline-offset-4"
          >
            もどる
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-ai px-6 py-3 text-paper transition-colors hover:bg-ai-deep disabled:opacity-50"
          >
            {pending ? "記しています…" : "帳面に記す"}
          </button>
        </div>
      </form>
    </div>
  );
}
