"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { IconCode, IconEye, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { previewTemplate } from "./api";
import type { PreviewResponse } from "./types";
import type { Contact } from "@/features/contacts/types";
import { fetchContacts } from "@/features/contacts/api";

type TemplateLivePreviewProps = {
  subjectTpl: string;
  htmlTpl: string;
};

export function TemplateLivePreview({
  subjectTpl,
  htmlTpl,
}: TemplateLivePreviewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  const requestSeq = useRef(0);

  // Cargar contactos para probar variables con datos reales
  useEffect(() => {
    fetchContacts({ limit: 50 })
      .then((data) => setContacts(data.contacts))
      .catch(() => toast.error("Error al cargar contactos"));
  }, []);

  const canPreview = subjectTpl.trim().length > 0 && htmlTpl.trim().length > 0;

  const loadPreview = useCallback(async () => {
    if (!canPreview) {
      setPreview(null);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const result = await previewTemplate({
        subjectTpl,
        htmlTpl,
        contactId: selectedContactId || undefined,
      });
      if (requestSeq.current !== seq) return;
      setPreview(result);
    } catch (err) {
      if (requestSeq.current !== seq) return;
      toast.error(err instanceof Error ? err.message : "Error al previsualizar");
      setPreview(null);
    } finally {
      if (requestSeq.current === seq) setLoading(false);
    }
  }, [canPreview, subjectTpl, htmlTpl, selectedContactId]);

  // Live preview con debounce para no spamear el endpoint en cada tecla
  useEffect(() => {
    if (!canPreview) {
      setPreview(null);
      return;
    }

    const handle = window.setTimeout(() => {
      void loadPreview();
    }, 350);

    return () => window.clearTimeout(handle);
  }, [canPreview, loadPreview]);

  const sanitizedHtml = useMemo(() => {
    return preview?.html ? DOMPurify.sanitize(preview.html) : "";
  }, [preview?.html]);

  return (
    <div className="h-full rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden flex flex-col">
      <div className="border-b border-slate-800 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-200 font-medium">Live preview</div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="min-w-[220px]">
            <Label className="text-slate-400 text-xs mb-1 block">
              Probar con contacto
            </Label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Sin contacto (valores vacíos)</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email} {c.firstName ? `(${c.firstName})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 self-end">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPreview}
              disabled={loading || !canPreview}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-60"
              title="Actualizar preview"
            >
              <IconRefresh
                className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHtml((v) => !v)}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
              title={showHtml ? "Ver render" : "Ver HTML"}
            >
              {showHtml ? (
                <IconEye className="h-4 w-4 mr-1" />
              ) : (
                <IconCode className="h-4 w-4 mr-1" />
              )}
              {showHtml ? "Ver render" : "Ver HTML"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-3 p-3">
        {!canPreview ? (
          <div className="text-sm text-slate-400">
            Escribí el asunto y el HTML para ver la preview.
          </div>
        ) : (
          <>
            {/* Asunto */}
            {preview && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-500 mb-1">Asunto:</div>
                <div className="text-slate-200 font-medium">{preview.subject}</div>
              </div>
            )}

            {/* Cuerpo */}
            <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-white">
              {loading ? (
                <div className="flex items-center justify-center h-64 bg-slate-950/30">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                </div>
              ) : showHtml ? (
                <pre className="p-4 text-xs text-slate-800 font-mono whitespace-pre-wrap overflow-auto">
                  {preview?.html ?? ""}
                </pre>
              ) : (
                <div
                  className="p-4 min-h-[300px]"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

