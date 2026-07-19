"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthFormState } from "../actions";

const initialState: AuthFormState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl tracking-widest text-center">
          Weft
        </h1>
        <p className="mt-2 text-center text-sm text-usuzumi">
          あたらしい帳面をつくる
        </p>

        <form
          action={formAction}
          className="mt-10 border border-keisen bg-paper px-6 py-8"
        >
          <label className="block text-sm" htmlFor="display_name">
            表示名
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="nickname"
            placeholder="帳面に記す名前"
            className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none placeholder:text-keisen focus:border-ai"
          />

          <label className="mt-6 block text-sm" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none focus:border-ai"
          />

          <label className="mt-6 block text-sm" htmlFor="password">
            パスワード(8文字以上)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full border-b border-keisen bg-transparent py-2 outline-none focus:border-ai"
          />

          {state.error && (
            <p role="alert" className="mt-4 text-sm text-ai-deep">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-8 w-full bg-ai py-3 text-paper transition-colors hover:bg-ai-deep disabled:opacity-50"
          >
            {pending ? "つくっています…" : "帳面をつくる"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-usuzumi">
          すでにお持ちの方は{" "}
          <Link href="/login" className="text-ai underline underline-offset-4">
            ひらく
          </Link>
        </p>
      </div>
    </main>
  );
}
