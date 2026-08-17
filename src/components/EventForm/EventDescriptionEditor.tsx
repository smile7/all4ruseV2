"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import data from "@emoji-mart/data";
import type { Editor } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Smile,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Toggle } from "~/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  EVENT_DESCRIPTION_EDITOR_INNER_CLASSES,
  normalizeDescriptionForEditor,
  sanitizeEventDescription,
} from "~/lib/event-description-html";
import { cn } from "~/lib/utils";

function EmojiPickerLoader() {
  const t = useTranslations("CreateEvent");
  return (
    <div className="text-muted-foreground flex h-[360px] w-[352px] items-center justify-center text-sm">
      {t("editorEmojiLoading")}
    </div>
  );
}

const EmojiPicker = dynamic(() => import("@emoji-mart/react"), {
  ssr: false,
  loading: () => <EmojiPickerLoader />,
});

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

function blockTypeValue(editor: Editor | null): string {
  if (!editor) return "paragraph";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

function currentTextAlign(
  editor: Editor | null,
): "left" | "center" | "right" | "justify" {
  if (!editor) return "left";
  const attrs =
    editor.getAttributes("paragraph")?.textAlign ??
    editor.getAttributes("heading")?.textAlign ??
    "left";
  if (attrs === "center" || attrs === "right" || attrs === "justify")
    return attrs;
  return "left";
}

export function EventDescriptionEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  required = false,
}: Props) {
  const t = useTranslations("CreateEvent");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  const pickerLocale = useMemo(() => {
    if (locale === "ua") return "uk";
    return locale;
  }, [locale]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      content: sanitizeEventDescription(normalizeDescriptionForEditor(value)),
      editorProps: {
        attributes: {
          class: cn(
            EVENT_DESCRIPTION_EDITOR_INNER_CLASSES,
            "prose prose-sm dark:prose-invert max-w-none [&_p]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground",
          ),
        },
      },
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          codeBlock: false,
          code: false,
          horizontalRule: false,
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
      ],
      onUpdate: ({ editor: ed }) => {
        onChange(sanitizeEventDescription(ed.getHTML()));
      },
    },
    [],
  );

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // Sync external value changes — e.g. when SmartFillPanel applies a draft.
  // During normal typing the editor owns the value, so we guard against
  // redundant setContent calls by comparing the sanitized HTML strings.
  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;

    const incoming = sanitizeEventDescription(
      normalizeDescriptionForEditor(value),
    );
    const current = sanitizeEventDescription(editor.getHTML());
    if (incoming !== current) {
      // emitUpdate: false prevents triggering onChange → infinite loop
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="bg-muted/30 text-muted-foreground min-h-[260px] animate-pulse rounded-md border"
        aria-hidden
      />
    );
  }

  const align = currentTextAlign(editor);
  const block = blockTypeValue(editor);

  const emojiTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      className="event-description-editor border-input bg-background/30 focus-within:ring-ring rounded-md border shadow-xs focus-within:ring-2"
      aria-required={required || undefined}
    >
      <div
        className="bg-muted/30 flex flex-wrap items-center gap-1 border-b p-2"
        role="toolbar"
        aria-label={t("editorToolbarLabel")}
      >
        <Select
          value={block}
          onValueChange={(v) => {
            const chain = editor.chain().focus();
            if (v === "paragraph") {
              chain.setParagraph().run();
              return;
            }
            if (v === "h2") {
              chain.setHeading({ level: 2 }).run();
              return;
            }
            chain.setHeading({ level: 3 }).run();
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-9 w-[158px] lg:w-[180px]"
            onPointerDown={(e) => {
              e.preventDefault();
            }}
            aria-label={t("editorBlockStyle")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="paragraph">
              {t("editorStyleParagraph")}
            </SelectItem>
            <SelectItem value="h2">{t("editorStyleHeadingLarge")}</SelectItem>
            <SelectItem value="h3">{t("editorStyleHeadingMedium")}</SelectItem>
          </SelectContent>
        </Select>

        <Separator
          orientation="vertical"
          className="mx-0.5 hidden h-6 sm:block"
        />

        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("bold")}
          disabled={disabled}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label={t("editorBold")}
          onPointerDown={(e) => e.preventDefault()}
        >
          <Bold className="size-4" />
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("italic")}
          disabled={disabled}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label={t("editorItalic")}
          onPointerDown={(e) => e.preventDefault()}
        >
          <Italic className="size-4" />
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("underline")}
          disabled={disabled}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label={t("editorUnderline")}
          onPointerDown={(e) => e.preventDefault()}
        >
          <UnderlineIcon className="size-4" />
        </Toggle>

        <Separator
          orientation="vertical"
          className="mx-0.5 hidden h-6 sm:block"
        />

        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={align}
          disabled={disabled}
          onValueChange={(v) => {
            if (!v) return;
            editor.chain().focus().setTextAlign(v).run();
          }}
          aria-label={t("editorAlignment")}
        >
          <ToggleGroupItem
            value="left"
            size="sm"
            aria-label={t("editorAlignLeft")}
            onPointerDown={(e) => e.preventDefault()}
          >
            <AlignLeft className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            size="sm"
            aria-label={t("editorAlignCenter")}
            onPointerDown={(e) => e.preventDefault()}
          >
            <AlignCenter className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            size="sm"
            aria-label={t("editorAlignRight")}
            onPointerDown={(e) => e.preventDefault()}
          >
            <AlignRight className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="justify"
            size="sm"
            aria-label={t("editorAlignJustify")}
            onPointerDown={(e) => e.preventDefault()}
          >
            <AlignJustify className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator
          orientation="vertical"
          className="mx-0.5 hidden h-6 sm:block"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="gap-1 px-2"
              aria-label={t("editorEmoji")}
              onPointerDown={(e) => e.preventDefault()}
            >
              <Smile className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="border-0 bg-transparent p-0 shadow-none"
            align="start"
          >
            <EmojiPicker
              data={data}
              theme={emojiTheme}
              locale={pickerLocale}
              onEmojiSelect={(em: unknown) => {
                const native =
                  em &&
                  typeof em === "object" &&
                  "native" in em &&
                  typeof (em as { native: unknown }).native === "string"
                    ? (em as { native: string }).native
                    : "";
                if (!native) return;
                editor.chain().focus().insertContent(native).run();
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative min-h-[220px]" onBlur={onBlur}>
        {editor.isEmpty && placeholder && (
          <p
            className="text-muted-foreground pointer-events-none absolute top-0 left-0 px-3 py-2 text-sm"
            aria-hidden
          >
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
