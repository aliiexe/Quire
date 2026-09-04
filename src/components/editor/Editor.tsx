"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { linter, Diagnostic as CMLintDiagnostic } from "@codemirror/lint";

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
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--quire-hover)"
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
}

export function Editor({ value, onChange, language = "latex", diagnostics = [] }: EditorProps) {
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

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      className="h-full flex-1 text-base transition-all duration-150 ease-out"
      theme="none"
      extensions={[
        editorTheme,
        syntaxHighlighting(customHighlighting),
        StreamLanguage.define(stex),
        linter(lintSource),
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
