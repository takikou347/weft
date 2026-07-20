"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  createItem,
  updateItem,
  type ItemFormState,
} from "./actions";
import type { CreatableType } from "@/lib/items";
import {
  PAPER_CHOICES,
  STAMP_CHOICES,
  TASK_STATUS_LABELS,
} from "@/lib/items";

const initialState: ItemFormState = { error: null };

const TYPE_HEADINGS: Record<CreatableType, { title: string; note: string }> = {
  diary: { title: "日記を書く", note: "書いた日記は、あなたにしか見えません。" },
  event: { title: "予定を追加する", note: "追加した予定は、あなたにしか見えません。" },
  expense: { title: "収支を記録する", note: "記録した収支は、あなたにしか見えません。" },
  task: { title: "タスクを追加する", note: "追加したタスクは、あなたにしか見えません。" },
};

type Defaults = {
  id?: string;
  occurredOn: string;
  title?: string;
  body?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  place?: string;
  memo?: string;
  amount?: number;
  kind?: "income" | "expense";
  category?: string;
  status?: "todo" | "doing" | "done";
  paper?: string;
  stamp?: string;
};

export function ItemForm({
  type,
  mode,
  categories,
  linkTo,
  defaults,
  backHref,
}: {
  type: CreatableType;
  mode: "create" | "edit";
  categories: string[];
  linkTo?: string;
  defaults: Defaults;
  backHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createItem : updateItem,
    initialState,
  );
  const heading = TYPE_HEADINGS[type];

  return (
    <div>
      <h2 className="font-serif text-2xl">
        {mode === "create" ? heading.title : "編集する"}
      </h2>
      <p className="mt-1 text-sm text-usuzumi">{heading.note}</p>

      <Card className="mt-6 px-6 py-8">
        <form action={formAction}>
          <input type="hidden" name="type" value={type} />
          {mode === "edit" && defaults.id && (
            <input type="hidden" name="id" value={defaults.id} />
          )}
          {linkTo && <input type="hidden" name="link_to" value={linkTo} />}

          <Label htmlFor="occurred_on">日付</Label>
          <Input
            id="occurred_on"
            name="occurred_on"
            type="date"
            required
            defaultValue={defaults.occurredOn}
            className="mt-1 w-auto"
          />

          {type === "expense" ? (
            <>
              <fieldset className="mt-6">
                <legend className="text-sm">出入り</legend>
                <div className="mt-1 flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="kind"
                      value="expense"
                      defaultChecked={(defaults.kind ?? "expense") === "expense"}
                      className="accent-ai"
                    />
                    支出
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="kind"
                      value="income"
                      defaultChecked={defaults.kind === "income"}
                      className="accent-ai"
                    />
                    収入
                  </label>
                </div>
              </fieldset>

              <Label className="mt-6" htmlFor="amount">
                金額(円)
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={defaults.amount}
                className="mt-1"
              />

              <Label className="mt-6" htmlFor="category">
                費目
              </Label>
              <Input
                id="category"
                name="category"
                list="category-list"
                defaultValue={defaults.category ?? categories[0] ?? "その他"}
                className="mt-1"
              />
              <datalist id="category-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <Label className="mt-6" htmlFor="title">
                摘要(なくてもかまいません)
              </Label>
              <Input
                id="title"
                name="title"
                type="text"
                defaultValue={defaults.title}
                className="mt-1"
              />
            </>
          ) : (
            <>
              <Label className="mt-6" htmlFor="title">
                題{type === "diary" ? "(なくてもかまいません)" : ""}
              </Label>
              <Input
                id="title"
                name="title"
                type="text"
                defaultValue={defaults.title}
                className="mt-1"
              />
            </>
          )}

          {type === "event" && (
            <>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="all_day"
                  defaultChecked={defaults.allDay}
                  className="accent-ai"
                />
                終日
              </label>
              <div className="mt-4 flex items-center gap-3">
                <div>
                  <Label htmlFor="start_time">はじまり</Label>
                  <Input
                    id="start_time"
                    name="start_time"
                    type="time"
                    defaultValue={defaults.startTime}
                    className="mt-1 w-auto"
                  />
                </div>
                <span className="pt-6 text-usuzumi">〜</span>
                <div>
                  <Label htmlFor="end_time">おわり</Label>
                  <Input
                    id="end_time"
                    name="end_time"
                    type="time"
                    defaultValue={defaults.endTime}
                    className="mt-1 w-auto"
                  />
                </div>
              </div>
              <Label className="mt-6" htmlFor="place">
                場所
              </Label>
              <Input
                id="place"
                name="place"
                type="text"
                defaultValue={defaults.place}
                className="mt-1"
              />
              <Label className="mt-6" htmlFor="memo">
                メモ
              </Label>
              <Textarea
                id="memo"
                name="memo"
                rows={3}
                defaultValue={defaults.memo}
                className="mt-1"
              />
            </>
          )}

          {type === "task" && (
            <>
              <Label className="mt-6" htmlFor="status">
                すすみ具合
              </Label>
              <NativeSelect
                id="status"
                name="status"
                defaultValue={defaults.status ?? "todo"}
                className="mt-1 w-auto"
              >
                {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </>
          )}

          {(type === "diary" || type === "task") && (
            <>
              <Label className="mt-6" htmlFor="body">
                本文
              </Label>
              <Textarea
                id="body"
                name="body"
                rows={type === "diary" ? 8 : 3}
                defaultValue={defaults.body}
                className="mt-1"
              />
            </>
          )}

          {type === "diary" && (
            <>
              <fieldset className="mt-6">
                <legend className="text-sm">用紙</legend>
                <div className="mt-1 flex flex-wrap gap-4 text-sm">
                  {PAPER_CHOICES.map((p) => (
                    <label key={p.value} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="paper"
                        value={p.value}
                        defaultChecked={(defaults.paper ?? "plain") === p.value}
                        className="accent-ai"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-4">
                <legend className="text-sm">スタンプ</legend>
                <div className="mt-1 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="stamp"
                      value=""
                      defaultChecked={!defaults.stamp}
                      className="accent-ai"
                    />
                    なし
                  </label>
                  {STAMP_CHOICES.map((s) => (
                    <label key={s} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="stamp"
                        value={s}
                        defaultChecked={defaults.stamp === s}
                        className="accent-ai"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {state.error && (
            <p role="alert" className="mt-4 text-sm text-ai-deep">
              {state.error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Link
              href={backHref}
              className="text-sm text-usuzumi underline underline-offset-4"
            >
              戻る
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "保存しています…" : "保存する"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
