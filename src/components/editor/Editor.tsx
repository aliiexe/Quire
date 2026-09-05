"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { Decoration, EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { linter, Diagnostic as CMLintDiagnostic } from "@codemirror/lint";
import type { WritingSelection } from "@/components/ai/WritingAssistant";

// We need a custom interface for Quire's diagnostics
export interface QuireDiagnostic {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning";
}

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--quire-editor)",
    color: "var(--quire-text)",
    height: "100%",
    fontSize: "14.5px",
    lineHeight: "1.65",
    fontFamily: "ui-monospace, SFMono-Regular, JetBrains Mono, Geist Mono, monospace",
  },
  ".cm-content": {
    caretColor: "var(--quire-text)",
    paddingTop: "24px",
    paddingBottom: "24px",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--quire-text)",
    borderLeftWidth: "2px"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(255, 0, 0, 0.30) !important"
  },
  ".cm-content ::selection": {
    backgroundColor: "rgba(255, 0, 0, 0.36)",
    color: "var(--quire-text)"
  },
  ".cm-quire-draft-preview": {
    backgroundColor: "color-mix(in srgb, var(--quire-red) 13%, transparent)",
    borderBottom: "2px solid var(--quire-red)"
  },
  ".cm-gutters": {
    backgroundColor: "var(--quire-editor)",
    color: "var(--quire-muted)",
    borderRight: "none",
    paddingRight: "8px",
    paddingLeft: "8px",
    fontSize: "13px"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--quire-text)"
  },
  ".cm-activeLine": {
    backgroundColor: "var(--quire-active-line)"
  },
  ".cm-lintRange-error": {
    backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"6\" height=\"3\"><path d=\"m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0\" stroke=\"%23ff4444\" fill=\"none\" stroke-width=\"1\"/></svg>')",
    backgroundPosition: "bottom left",
    backgroundRepeat: "repeat-x",
    paddingBottom: "2px"
  },
  ".cm-lintRange-warning": {
    backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"6\" height=\"3\"><path d=\"m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0\" stroke=\"%23eab308\" fill=\"none\" stroke-width=\"1\"/></svg>')",
    backgroundPosition: "bottom left",
    backgroundRepeat: "repeat-x",
    paddingBottom: "2px"
  }
});

const customHighlighting = HighlightStyle.define([
  { tag: t.keyword, color: "#d97736" }, // Warm muted gold/orange for commands
  { tag: t.comment, color: "var(--quire-muted)", fontStyle: "italic" }, // Soft gray for comments
  { tag: t.bracket, color: "var(--quire-muted)" }, // Muted light gray for braces
  { tag: t.string, color: "#7a995c" },
  { tag: t.variableName, color: "var(--quire-text)" },
  { tag: t.operator, color: "var(--quire-muted)" },
]);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "latex" | "markdown" | "text";
  diagnostics?: QuireDiagnostic[];
  onSelectionChange?: (selection: WritingSelection) => void;
  proposalRange?: { from: number; to: number };
  readOnly?: boolean;
}

export function Editor({ value, onChange, language = "latex", diagnostics = [], onSelectionChange, proposalRange, readOnly = false }: EditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  useEffect(() => {
    const handleGoto = (e: Event) => {
      const customEvent = e as CustomEvent<{ line: number }>;
      const view = editorRef.current?.view;
      if (view && customEvent.detail.line) {
        const line = Math.max(1, Math.min(customEvent.detail.line, view.state.doc.lines));
        const lineInfo = view.state.doc.line(line);
        view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true
        });
      }
    };
    window.addEventListener('editor-goto-line', handleGoto);
    return () => window.removeEventListener('editor-goto-line', handleGoto);
  }, []);

  const lintSource = useMemo(() => {
    return (view: EditorView) => {
      const cmDiagnostics: CMLintDiagnostic[] = [];
      const doc = view.state.doc;
      
      diagnostics.forEach(d => {
        if (d.line > 0 && d.line <= doc.lines) {
          const lineInfo = doc.line(d.line);
          cmDiagnostics.push({
            from: lineInfo.from,
            to: lineInfo.to,
            severity: d.severity,
            message: d.message,
          });
        }
      });
      return cmDiagnostics;
    };
  }, [diagnostics]);

  const selectionListener = useMemo(() => EditorView.updateListener.of((update) => {
    if (!update.selectionSet || !onSelectionChange) return;
    const selection = update.state.selection.main;
    onSelectionChange({
      from: selection.from,
      to: selection.to,
      text: update.state.sliceDoc(selection.from, selection.to),
    });
  }), [onSelectionChange]);

  const proposalPreview = useMemo(() => {
    if (!proposalRange || proposalRange.from < 0 || proposalRange.to <= proposalRange.from || proposalRange.to > value.length) return null;
    return EditorView.decorations.of(Decoration.set([Decoration.mark({ class: "cm-quire-draft-preview" }).range(proposalRange.from, proposalRange.to)]));
  }, [proposalRange?.from, proposalRange?.to, value.length]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      selection={proposalRange ? { anchor: proposalRange.from, head: proposalRange.to } : undefined}
      height="100%"
      className="h-full flex-1 text-base transition-all duration-150 ease-out"
      theme="none"
      editable={!readOnly}
      readOnly={readOnly}
      extensions={[
        editorTheme,
        syntaxHighlighting(customHighlighting),
        StreamLanguage.define(stex),
        linter(lintSource),
        selectionListener,
        ...(proposalPreview ? [proposalPreview] : []),
        EditorView.lineWrapping
      ]}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        foldGutter: false,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
    />
  );
}
