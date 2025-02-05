"use client";

import { cn } from "@/lib/utils";

export function TypingIndicator({ className }) {
  return (
    <div className={cn("flex items-center gap-1 mt-1", className)}>
      <div className="flex space-x-1 bg-white p-3 rounded-2xl">
        <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite_100ms]" />
        <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]" />
        <div className="w-2 h-2 bg-primary rounded-full animate-[bounce_1s_infinite_300ms]" />
      </div>
    </div>
  );
}
