"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

        <Card className="mt-10 px-6 py-8">
          <form action={formAction}>
            {next && <input type="hidden" name="next" value={next} />}
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1"
            />

            <Label className="mt-6" htmlFor="password">
              パスワード
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1"
            />

            {state.error && (
              <p role="alert" className="mt-4 text-sm text-ai-deep">
                {state.error}
              </p>
            )}

            <Button type="submit" disabled={pending} className="mt-8 w-full">
              {pending ? "ログインしています…" : "ログイン"}
            </Button>
          </form>
        </Card>

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
