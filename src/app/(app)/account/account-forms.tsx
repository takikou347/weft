"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteAccount,
  updateProfile,
  type AccountFormState,
} from "./actions";

const initialState: AccountFormState = { error: null };

export function AccountForms({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAccount,
    initialState,
  );

  return (
    <div>
      <h2 className="font-serif text-2xl">あなたのこと</h2>
      <p className="mt-1 text-sm text-usuzumi">{email}</p>

      <Card className="mt-6 px-6 py-8">
        <form action={profileAction}>
          <Label htmlFor="display_name">表示名</Label>
          <Input
            id="display_name"
            name="display_name"
            type="text"
            required
            maxLength={30}
            defaultValue={displayName}
            className="mt-1"
          />
          {profileState.error && (
            <p role="alert" className="mt-3 text-sm text-ai-deep">
              {profileState.error}
            </p>
          )}
          {profileState.done && (
            <p className="mt-3 text-sm text-ai">保存しました。</p>
          )}
          <div className="mt-6 text-right">
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "保存しています…" : "保存する"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="mt-12">
        <h3 className="border-l-4 border-ai pl-2 font-medium">退会</h3>
        <Card className="mt-3 px-6 py-6 text-sm leading-loose">
          <p>
            退会すると、あなたの記録・写真・共有・通知は<strong>すべて削除</strong>されます。
            共有していた記録は、共有先のメンバーからも見えなくなります。
            削除したものは元に戻せません。
          </p>
          <form action={deleteAction} className="mt-4">
            <Label htmlFor="confirm">
              確認のため「退会」と入力してください
            </Label>
            <Input
              id="confirm"
              name="confirm"
              type="text"
              required
              className="mt-1 w-40"
            />
            {deleteState.error && (
              <p role="alert" className="mt-3 text-sm text-ai-deep">
                {deleteState.error}
              </p>
            )}
            <div className="mt-4">
              <Button
                type="submit"
                variant="outline"
                disabled={deletePending}
                className="text-destructive hover:text-destructive"
              >
                {deletePending ? "処理しています…" : "退会する"}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      <p className="mt-8 flex gap-4 text-xs text-usuzumi">
        <Link href="/terms" className="underline underline-offset-4">
          利用規約
        </Link>
        <Link href="/privacy" className="underline underline-offset-4">
          プライバシーポリシー
        </Link>
      </p>
    </div>
  );
}
