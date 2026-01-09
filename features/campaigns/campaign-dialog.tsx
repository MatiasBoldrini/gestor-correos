"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconLoader2 } from "@tabler/icons-react";
import { TagMultiselect } from "@/features/contacts/tag-multiselect";
import type { CampaignFilters } from "./types";

type Template = {
  id: string;
  name: string;
};

type CampaignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onSave: (data: {
    name: string;
    templateId: string;
    filters: CampaignFilters;
    fromAlias?: string;
  }) => Promise<void>;
  saving: boolean;
};

export function CampaignDialog({
  open,
  onOpenChange,
  templates,
  onSave,
  saving,
}: CampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CampaignDialogContent
        key={open ? "open" : "closed"}
        templates={templates}
        onSave={onSave}
        saving={saving}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

function CampaignDialogContent(props: {
  templates: Template[];
  onSave: CampaignDialogProps["onSave"];
  saving: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [fromAlias, setFromAlias] = useState("");
  const [filters, setFilters] = useState<CampaignFilters>({
    query: "",
    company: "",
    position: "",
    tagIds: [],
  });

  const effectiveTemplateId = templateId || props.templates[0]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !effectiveTemplateId) return;

    // Limpiar filtros vacíos
    const cleanFilters: CampaignFilters = {};
    if (filters.query?.trim()) cleanFilters.query = filters.query.trim();
    if (filters.company?.trim()) cleanFilters.company = filters.company.trim();
    if (filters.position?.trim()) cleanFilters.position = filters.position.trim();
    if (filters.tagIds && filters.tagIds.length > 0) cleanFilters.tagIds = filters.tagIds;

    await props.onSave({
      name: name.trim(),
      templateId: effectiveTemplateId,
      filters: cleanFilters,
      fromAlias: fromAlias.trim() || undefined,
    });
  };

  const canSubmit = name.trim() && effectiveTemplateId && !props.saving;

  return (
    <DialogContent className="border-slate-800 bg-slate-950 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-white">Nueva campaña</DialogTitle>
        <DialogDescription className="text-slate-400">
          Creá una campaña seleccionando una plantilla y definiendo la audiencia
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Nombre de la campaña *</Label>
          <Input
            placeholder="Ej: Newsletter Diciembre 2024"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-200"
            autoFocus
          />
        </div>

        {/* Template */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Plantilla *</Label>
          <select
            value={effectiveTemplateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            {props.templates.length === 0 ? (
              <option value="">No hay plantillas</option>
            ) : (
              props.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* From Alias */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">Alias de remitente</Label>
          <Input
            placeholder="Ej: Mi Empresa"
            value={fromAlias}
            onChange={(e) => setFromAlias(e.target.value)}
            className="border-slate-700 bg-slate-900 text-slate-200"
          />
          <p className="text-xs text-slate-500">
            Aparecerá como nombre del remitente en el email
          </p>
        </div>

        {/* Filtros de segmento */}
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-sm font-medium text-slate-300">
            Filtros de audiencia (opcional)
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Empresa</Label>
              <Input
                placeholder="Contiene..."
                value={filters.company ?? ""}
                onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                className="border-slate-700 bg-slate-900 text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Cargo</Label>
              <Input
                placeholder="Contiene..."
                value={filters.position ?? ""}
                onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                className="border-slate-700 bg-slate-900 text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Tags (todos deben coincidir)</Label>
            <TagMultiselect
              selectedIds={filters.tagIds ?? []}
              onChange={(tagIds) => setFilters({ ...filters, tagIds })}
              allowCreate={false}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={props.onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {props.saving ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear campaña"
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
