"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IconChevronDown, IconPlus, IconX } from "@tabler/icons-react";
import { fetchTags, createTag } from "./api";
import type { Tag } from "./types";

type TagMultiselectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  kind?: "tipo" | "rubro";
  placeholder?: string;
  allowCreate?: boolean;
};

export function TagMultiselect({
  selectedIds,
  onChange,
  kind,
  placeholder = "Seleccionar tags...",
  allowCreate = true,
}: TagMultiselectProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagKind, setNewTagKind] = useState<"tipo" | "rubro">(kind ?? "tipo");
  const [creating, setCreating] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTags(kind);
      setTags(data);
    } catch {
      // Error silencioso
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleToggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const tag = await createTag(newTagName.trim(), newTagKind);
      setTags((prev) => [...prev, tag]);
      onChange([...selectedIds, tag.id]);
      setNewTagName("");
    } catch {
      // Error silencioso
    } finally {
      setCreating(false);
    }
  };

  const selectedTags = tags.filter((t) => selectedIds.includes(t.id));

  const tipoTags = tags.filter((t) => t.kind === "tipo");
  const rubroTags = tags.filter((t) => t.kind === "rubro");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedTags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="bg-slate-700 text-slate-200"
                >
                  {tag.name}
                </Badge>
              ))}
              {selectedTags.length > 3 && (
                <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                  +{selectedTags.length - 3}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
          <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 border-slate-700 bg-slate-900 p-0"
        align="start"
      >
        <ScrollArea className="max-h-64">
          <div className="p-2">
            {loading ? (
              <p className="p-2 text-center text-sm text-slate-500">
                Cargando...
              </p>
            ) : (
              <>
                {/* Tipo tags */}
                {(!kind || kind === "tipo") && tipoTags.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-2 text-xs font-medium uppercase text-slate-500">
                      Tipo
                    </p>
                    {tipoTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-800"
                        onClick={() => handleToggle(tag.id)}
                      >
                        <Checkbox
                          checked={selectedIds.includes(tag.id)}
                          onCheckedChange={() => handleToggle(tag.id)}
                          className="border-slate-600"
                        />
                        <span className="text-sm text-slate-300">{tag.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rubro tags */}
                {(!kind || kind === "rubro") && rubroTags.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-2 text-xs font-medium uppercase text-slate-500">
                      Rubro
                    </p>
                    {rubroTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-800"
                        onClick={() => handleToggle(tag.id)}
                      >
                        <Checkbox
                          checked={selectedIds.includes(tag.id)}
                          onCheckedChange={() => handleToggle(tag.id)}
                          className="border-slate-600"
                        />
                        <span className="text-sm text-slate-300">{tag.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tags.length === 0 && (
                  <p className="p-2 text-center text-sm text-slate-500">
                    No hay tags
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Crear nuevo tag */}
        {allowCreate && (
          <div className="border-t border-slate-700 p-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-8 border-slate-700 bg-slate-800 text-sm text-slate-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              {!kind && (
                <select
                  value={newTagKind}
                  onChange={(e) => setNewTagKind(e.target.value as "tipo" | "rubro")}
                  className="h-8 rounded border border-slate-700 bg-slate-800 px-2 text-sm text-slate-200"
                >
                  <option value="tipo">Tipo</option>
                  <option value="rubro">Rubro</option>
                </select>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || creating}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Tags seleccionados para quitar */}
        {selectedTags.length > 0 && (
          <div className="border-t border-slate-700 p-2">
            <p className="mb-1 text-xs font-medium uppercase text-slate-500">
              Seleccionados
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="cursor-pointer bg-slate-700 text-slate-200 hover:bg-slate-600"
                  onClick={() => handleToggle(tag.id)}
                >
                  {tag.name}
                  <IconX className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
