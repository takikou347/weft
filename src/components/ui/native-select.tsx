import * as React from "react";

import { cn } from "@/lib/utils";

/* ネイティブ <select> のテーマ付きラッパー。
   モバイルではOS標準のピッカーが最も使いやすいため、Radixベースの
   Select ではなくネイティブ要素を採用する */
function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "flex h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 text-base transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
