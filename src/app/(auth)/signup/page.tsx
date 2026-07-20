"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          アカウント登録
        </p>

        <Card className="mt-10 px-6 py-8">
          <form action={formAction}>
            <Label htmlFor="display_name">表示名</Label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="nickname"
              placeholder="表示名"
              className="mt-1"
            />

            <Label className="mt-6" htmlFor="email">
              メールアドレス
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1"
            />

            <Label className="mt-6" htmlFor="password">
              パスワード(8文字以上)
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1"
            />

            {state.error && (
              <p role="alert" className="mt-4 text-sm text-ai-deep">
                {state.error}
              </p>
            )}

            <p className="mt-6 text-xs text-usuzumi">
              登録すると、
              <Link href="/terms" className="text-ai underline underline-offset-4">
                利用規約
              </Link>
              と
              <Link
                href="/privacy"
                className="text-ai underline underline-offset-4"
              >
                プライバシーポリシー
              </Link>
              に同意したことになります。
            </p>

            <Button type="submit" disabled={pending} className="mt-4 w-full">
              {pending ? "登録しています…" : "新規登録"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-usuzumi">
          すでにお持ちの方は{" "}
          <Link href="/login" className="text-ai underline underline-offset-4">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
