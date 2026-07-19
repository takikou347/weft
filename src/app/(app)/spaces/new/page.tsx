"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createGroup, type SpaceFormState } from "../actions";

const initialState: SpaceFormState = { error: null };

export default function NewSpacePage() {
  const [state, formAction, pending] = useActionState(createGroup, initialState);

  return (
    <div>
      <h2 className="font-serif text-2xl">つどいをつくる</h2>
      <p className="mt-1 text-sm text-usuzumi">
        友だち・家族・サークルの回覧板になります。あなたが差し出した記録だけが、なかまに見えます。
      </p>

      <form
        action={formAction}
        className="mt-6 border border-keisen bg-paper px-6 py-8"
      >
        <label className="block text-sm" htmlFor="name">
          つどいの名前
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={50}
          placeholder="例: 山の会、田中家"
          className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none placeholder:text-keisen focus:border-ai"
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
            もどる
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-ai px-6 py-3 text-paper transition-colors hover:bg-ai-deep disabled:opacity-50"
          >
            {pending ? "つくっています…" : "つくる"}
          </button>
        </div>
      </form>
    </div>
  );
}
