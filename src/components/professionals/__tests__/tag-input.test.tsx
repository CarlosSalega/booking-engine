/**
 * Tests for the `TagInput` Client Component.
 *
 * The `TagInput` is a controlled `string[]` editor with three
 * interaction modes:
 *   - Type text + Enter  → append to the array (if non-empty + non-duplicate)
 *   - Type text + Tab    → append (accessibility — keyboard users shouldn't
 *                          be stuck if Enter isn't picked up)
 *   - Press Backspace on empty input → pop the last tag
 *   - Click × on a tag   → remove that tag
 *
 * Behavior covered:
 *   - Renders the current tags as removable chips.
 *   - Add via Enter: `addTag` commits the pending input.
 *   - Add via Tab: same as Enter (kicks users out of the field).
 *   - Backspace on empty input: pops the last tag.
 *   - Backspace on non-empty input: does NOT pop (just navigates inside text).
 *   - Dedup: identical (case-sensitive) tag is rejected.
 *   - Dedup: case-insensitive duplicate is rejected.
 *   - Max tags: when at MAX_TAGS, Enter no longer appends.
 *   - Empty input + Enter: no-op (whitespace ignored).
 *   - × button removes the right tag.
 *   - Disabled state: input is disabled, no add/remove possible.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TagInput } from "@/components/professionals/tag-input";

const MAX_TAGS = 10;

describe("TagInput — initial render", () => {
  it("renders the initial tags as chips", () => {
    render(<TagInput value={["Dermatología", "Cirugía"]} onChange={() => {}} />);
    expect(screen.getByText("Dermatología")).toBeInTheDocument();
    expect(screen.getByText("Cirugía")).toBeInTheDocument();
  });

  it("renders nothing for an empty initial value", () => {
    const { container } = render(<TagInput value={[]} onChange={() => {}} />);
    // No tag chips (badges) should be present; only the input wrapper and the field.
    // Tag chips are rendered as Badge elements with the tag-* data-testid (e.g. "tag-X").
    const chips = container.querySelectorAll('[data-slot="badge"]');
    expect(chips).toHaveLength(0);
  });
});

describe("TagInput — adding tags", () => {
  it("appends a tag when the user types and presses Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Cardiología{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["Cardiología"]);
  });

  it("appends a tag when the user types and presses Tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["Pediatría"]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Cardiología{Tab}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["Pediatría", "Cardiología"]);
  });

  it("clears the input after a successful add", async () => {
    const user = userEvent.setup();
    const ControlledTagInput = () => {
      const [tags, setTags] = React.useState<string[]>([]);
      return <TagInput value={tags} onChange={setTags} />;
    };
    // Use a lazy require pattern to avoid top-level React import noise.
    const React = await import("react");
    render(<ControlledTagInput />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "Cardiología{Enter}");
    expect(input.value).toBe("");
  });
});

describe("TagInput — backspace", () => {
  it("removes the last tag when the user presses Backspace on an empty input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["Cardiología", "Pediatría"]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    // Focus the input first
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith(["Cardiología"]);
  });

  it("does NOT remove a tag when the user presses Backspace on a non-empty input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["Cardiología"]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Pedia");
    await user.keyboard("{Backspace}"); // pops one char, no tag removed

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagInput — dedup", () => {
  it("rejects an exact duplicate (case-sensitive)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["Cardiología"]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Cardiología{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("rejects a case-insensitive duplicate", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["Cardiología"]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "CARDIOLOGÍA{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagInput — empty / whitespace input", () => {
  it("ignores Enter on an empty input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores Enter on a whitespace-only input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagInput — remove via × button", () => {
  it("removes the tag when its × button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["A", "B", "C"]} onChange={onChange} />);

    const removeButton = screen.getByRole("button", { name: /quitar tag B/i });
    await user.click(removeButton);

    expect(onChange).toHaveBeenCalledWith(["A", "C"]);
  });
});

describe("TagInput — max tags", () => {
  it("does not append when MAX_TAGS is reached (default 10)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const tenTags = Array.from({ length: MAX_TAGS }, (_, i) => `Tag ${i + 1}`);
    render(<TagInput value={tenTags} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "Tag 11{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagInput — disabled", () => {
  it("disables the input when disabled=true", () => {
    render(<TagInput value={["A"]} onChange={() => {}} disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("disables all remove buttons when disabled=true", () => {
    render(<TagInput value={["A", "B"]} onChange={() => {}} disabled />);
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });
});
