"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { login, type AuthFormState } from "../actions";

const initialState: AuthFormState = { error: null };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl tracking-widest text-center">
          Weft
        </h1>
        <p className="mt-2 text-center text-sm text-usuzumi">
          ログイン
        </p>

        <form
          action={formAction}
          className="mt-10 border border-keisen bg-paper px-6 py-8"
        >
          {next && <input type="hidden" name="next" value={next} />}
          <label className="block text-sm" htmlFor="email">
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
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
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
            {pending ? "ログインしています…" : "ログイン"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-usuzumi">
          はじめての方は{" "}
          <Link href="/signup" className="text-ai underline underline-offset-4">
            新規登録
          </Link>
        </p>
      </div>
    </main>
  );
}
