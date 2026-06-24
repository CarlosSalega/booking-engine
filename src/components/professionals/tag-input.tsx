/**
 * `TagInput` — a controlled `string[]` editor used to manage a
 * professional's `specialties`.
 *
 * Interaction model (mirrors the design's AD4):
 *   - Type a value + Enter (or Tab) → append a new tag.
 *   - Backspace on an empty input → pop the last tag.
 *   - Click the × button on a chip → remove that tag.
 *   - Whitespace-only or empty input + Enter → no-op.
 *   - Duplicate (case-insensitive) → no-op.
 *   - When `maxTags` is reached, Enter is a no-op (button is also
 *     disabled to provide a visual hint).
 *
 * The component is purely controlled: `value` is the source of truth,
 * `onChange` is the only way to mutate. The parent form owns the
 * state (typically with `useState` or react-hook-form) and re-renders
 * this component when the value changes. This keeps the input
 * decoupled from the surrounding form's validation strategy.
 *
 * Marked `"use client"` because the input owns local state for the
 * pending text the user is typing.
 */

"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_TAGS = 10;

interface TagInputProps {
  /** Current tag list (controlled). */
  value: string[];
  /** Called whenever a tag is added or removed. */
  onChange: (next: string[]) => void;
  /** Hard cap. Defaults to 10 (matches `professionalDataSchema.max(10)`). */
  maxTags?: number;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /** Disable both the input and the remove buttons. */
  disabled?: boolean;
  /** Aria label for the underlying input. */
  ariaLabel?: string;
}

export function TagInput({
  value,
  onChange,
  maxTags = DEFAULT_MAX_TAGS,
  placeholder = "Escribí una especialidad y presioná Enter…",
  disabled = false,
  ariaLabel = "Agregar especialidad",
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const isAtMax = value.length >= maxTags;

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    if (value.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
      // Duplicate — clear the input and bail.
      setDraft("");
      return;
    }
    if (isAtMax) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      commitDraft();
      return;
    }
    if (e.key === "Backspace" && draft.length === 0 && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function handleRemove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none cursor-not-allowed bg-input/50 opacity-50",
      )}
      data-testid="tag-input"
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 px-2 py-0.5 text-xs"
          data-testid={`tag-${tag}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => handleRemove(tag)}
            disabled={disabled}
            aria-label={`Quitar tag ${tag}`}
            className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isAtMax}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-7 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:border-0 focus-visible:ring-0"
        data-testid="tag-input-field"
      />
    </div>
  );
}
