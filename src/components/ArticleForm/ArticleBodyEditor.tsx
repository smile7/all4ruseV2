"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Toggle } from "~/components/ui/toggle";
import {
  ARTICLE_EDITOR_INNER_CLASSES,
  sanitizeArticleHtml,
} from "~/lib/article-html";
import { cn } from "~/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  onUploadError?: (message: string) => void;
};

function blockTypeValue(editor: Editor | null): string {
  if (!editor) return "paragraph";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("heading", { level: 4 })) return "h4";
  return "paragraph";
}

/**
 * A separate editor from EventDescriptionEditor on purpose: article bodies
 * allow links, inline images, h4 and dividers, and those must not leak into
 * the event editor, whose input comes from arbitrary users.
 */
export function ArticleBodyEditor({
  value,
  onChange,
  onBlur,
  disabled,
  onUploadError,
}: Props) {
  const t = useTranslations("CreateEvent");
  const tAdmin = useTranslations("MoreFromRuse.admin");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !disabled,
      content: value,
      editorProps: {
        attributes: {
          class: cn(
            ARTICLE_EDITOR_INNER_CLASSES,
            "prose prose-sm dark:prose-invert max-w-none",
          ),
        },
      },
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          codeBlock: false,
          code: false,
          link: {
            openOnClick: false,
            autolink: true,
            // Matches what the sanitizer forces on save.
            HTMLAttributes: { rel: "noopener" },
          },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Image.configure({
          HTMLAttributes: { loading: "lazy", decoding: "async" },
        }),
      ],
      onUpdate: ({ editor: ed }) => onChange(sanitizeArticleHtml(ed.getHTML())),
    },
    [],
  );

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const prevValueRef = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;

    if (sanitizeArticleHtml(editor.getHTML()) !== sanitizeArticleHtml(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  async function handleImagePick(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/articles/image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("upload_failed");

      const { url } = (await response.json()) as { url: string };
      editor?.chain().focus().setImage({ src: url, alt: "" }).run();
    } catch {
      onUploadError?.(tAdmin("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = window.prompt(tAdmin("editorLinkPrompt"));
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
  }

  if (!editor) {
    return (
      <div
        className="bg-muted/30 min-h-[420px] animate-pulse rounded-md border"
        aria-hidden
      />
    );
  }

  return (
    <div className="border-input bg-background/30 focus-within:ring-ring rounded-md border shadow-xs focus-within:ring-2">
      <div
        className="bg-muted/30 flex flex-wrap items-center gap-1 border-b p-2"
        role="toolbar"
        aria-label={t("editorToolbarLabel")}
      >
        <Select
          value={blockTypeValue(editor)}
          disabled={disabled}
          onValueChange={(next) => {
            const chain = editor.chain().focus();
            if (next === "paragraph") return chain.setParagraph().run();
            const level = next === "h2" ? 2 : next === "h3" ? 3 : 4;
            return chain.setHeading({ level }).run();
          }}
        >
          <SelectTrigger
            className="h-9 w-[158px] lg:w-[180px]"
            onPointerDown={(event) => event.preventDefault()}
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
            <SelectItem value="h4">
              {tAdmin("editorStyleHeadingSmall")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("bold")}
          disabled={disabled}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label={t("editorBold")}
          onPointerDown={(event) => event.preventDefault()}
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
          onPointerDown={(event) => event.preventDefault()}
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
          onPointerDown={(event) => event.preventDefault()}
        >
          <UnderlineIcon className="size-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("bulletList")}
          disabled={disabled}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          aria-label={tAdmin("editorBulletList")}
          onPointerDown={(event) => event.preventDefault()}
        >
          <List className="size-4" />
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("orderedList")}
          disabled={disabled}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          aria-label={tAdmin("editorOrderedList")}
          onPointerDown={(event) => event.preventDefault()}
        >
          <ListOrdered className="size-4" />
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("blockquote")}
          disabled={disabled}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
          aria-label={tAdmin("editorQuote")}
          onPointerDown={(event) => event.preventDefault()}
        >
          <Quote className="size-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <Toggle
          variant="outline"
          size="sm"
          pressed={editor.isActive("link")}
          disabled={disabled}
          onPressedChange={toggleLink}
          aria-label={
            editor.isActive("link")
              ? tAdmin("editorRemoveLink")
              : tAdmin("editorLink")
          }
          onPointerDown={(event) => event.preventDefault()}
        >
          {editor.isActive("link") ? (
            <Link2Off className="size-4" />
          ) : (
            <Link2 className="size-4" />
          )}
        </Toggle>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          className="gap-1 px-2"
          aria-label={tAdmin("editorImage")}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1 px-2"
          aria-label={tAdmin("editorDivider")}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleImagePick(file);
          }}
        />
      </div>

      <div className="relative min-h-[420px]" onBlur={onBlur}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
