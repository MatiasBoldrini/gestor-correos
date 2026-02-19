"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconInfoCircle } from "@tabler/icons-react";
import type { Template } from "./types";
import { TemplateLivePreview } from "./template-live-preview";

const templateFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  subjectTpl: z.string().min(1, "El asunto es obligatorio").max(500),
  htmlTpl: z.string().min(1, "El contenido HTML es obligatorio"),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

type TemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onSave: (data: {
    id?: string;
    name: string;
    subjectTpl: string;
    htmlTpl: string;
  }) => Promise<void>;
  saving?: boolean;
};

const AVAILABLE_VARIABLES = [
  { name: "FirstName", description: "Nombre del contacto", example: "{{FirstName}}" },
  { name: "LastName", description: "Apellido del contacto", example: "{{LastName}}" },
  { name: "Company", description: "Empresa del contacto", example: "{{Company}}" },
  { name: "UnsubscribeUrl", description: "URL de baja", example: "{{UnsubscribeUrl}}" },
];

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  saving,
}: TemplateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subjectTpl: "",
      htmlTpl: "",
    },
  });

  const [activeField, setActiveField] = useState<"subjectTpl" | "htmlTpl">(
    "htmlTpl"
  );
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const subjectTpl = useWatch({ control, name: "subjectTpl" }) ?? "";
  const htmlTpl = useWatch({ control, name: "htmlTpl" }) ?? "";

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          name: template.name,
          subjectTpl: template.subjectTpl,
          htmlTpl: template.htmlTpl,
        });
      } else {
        reset({
          name: "",
          subjectTpl: "",
          htmlTpl: "",
        });
      }
    }
  }, [open, template, reset]);

  const onSubmit = async (data: TemplateFormData) => {
    await onSave({
      id: template?.id,
      name: data.name,
      subjectTpl: data.subjectTpl,
      htmlTpl: data.htmlTpl,
    });
  };

  const subjectRegister = useMemo(() => register("subjectTpl"), [register]);
  const htmlRegister = useMemo(() => register("htmlTpl"), [register]);

  const insertVariable = (example: string) => {
    const field = activeField;
    const el =
      field === "subjectTpl" ? subjectInputRef.current : htmlTextareaRef.current;
    if (!el) return;

    const current = getValues(field);
    const start =
      typeof el.selectionStart === "number" ? el.selectionStart : current.length;
    const end =
      typeof el.selectionEnd === "number" ? el.selectionEnd : current.length;
    const next = `${current.slice(0, start)}${example}${current.slice(end)}`;

    setValue(field, next, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    // Restaurar foco y cursor luego de que RHF actualice el value
    window.requestAnimationFrame(() => {
      el.focus();
      if (typeof el.setSelectionRange === "function") {
        const pos = start + example.length;
        el.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-950 sm:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">
            {template ? "Editar plantilla" : "Nueva plantilla"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {template
              ? "Modificá los datos de la plantilla"
              : "Creá una plantilla de email con variables personalizables"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-hidden flex flex-col gap-4"
        >
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Editor */}
            <div className="overflow-auto pr-1 space-y-4">
              {/* Variables disponibles */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <IconInfoCircle className="h-4 w-4 text-blue-400" />
                  <span className="font-medium">
                    Variables disponibles (clic para insertar):
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVariable(v.example)}
                      className="rounded bg-slate-800 px-2 py-0.5 text-xs text-blue-300 font-mono hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={`${v.description} • Insertar ${v.example}`}
                      aria-label={`Insertar ${v.example}`}
                    >
                      {v.example}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Condicional:{" "}
                  <code className="text-emerald-400">
                    {
                      "{{#if FirstName}}Estimado/a {{FirstName}}{{else}}Estimado/a cliente{{/if}}"
                    }
                  </code>
                </p>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-300">
                  Nombre <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Mi plantilla de bienvenida"
                  {...register("name")}
                  className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              {/* Asunto */}
              <div className="space-y-1.5">
                <Label htmlFor="subjectTpl" className="text-slate-300">
                  Asunto <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="subjectTpl"
                  placeholder="Actualización para {{Company}} — propuesta de seguimiento"
                  {...subjectRegister}
                  ref={(el) => {
                    subjectRegister.ref(el);
                    subjectInputRef.current = el;
                  }}
                  onFocus={() => setActiveField("subjectTpl")}
                  className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
                />
                {errors.subjectTpl && (
                  <p className="text-xs text-red-400">
                    {errors.subjectTpl.message}
                  </p>
                )}
              </div>

              {/* HTML */}
              <div className="space-y-1.5">
                <Label htmlFor="htmlTpl" className="text-slate-300">
                  Contenido HTML <span className="text-red-400">*</span>
                </Label>
                <textarea
                  id="htmlTpl"
                  rows={12}
                  placeholder={`<html><body><p>Estimado/a {{FirstName}},</p><p>Gracias por tu tiempo. Queremos compartir una actualización relevante para {{Company}}.</p><p>Quedamos atentos para coordinar una reunión.</p><p>Saludos cordiales,<br/>Equipo Comercial</p></body></html>`}
                  {...htmlRegister}
                  ref={(el) => {
                    htmlRegister.ref(el);
                    htmlTextareaRef.current = el;
                  }}
                  onFocus={() => setActiveField("htmlTpl")}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                {errors.htmlTpl && (
                  <p className="text-xs text-red-400">{errors.htmlTpl.message}</p>
                )}
              </div>
            </div>

            {/* Live preview */}
            <div className="overflow-hidden">
              <TemplateLivePreview subjectTpl={subjectTpl} htmlTpl={htmlTpl} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Guardando..." : template ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
