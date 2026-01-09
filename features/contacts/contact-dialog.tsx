"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { TagMultiselect } from "./tag-multiselect";
import type { Contact } from "./types";

const contactFormSchema = z.object({
  email: z.email("Email inválido"),
  firstName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().max(100).optional().or(z.literal("")),
  company: z.string().max(200).optional().or(z.literal("")),
  position: z.string().max(200).optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

type ContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSave: (data: {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    position?: string;
    tagIds: string[];
  }) => Promise<void>;
  saving?: boolean;
};

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSave,
  saving,
}: ContactDialogProps) {
  const [tagIds, setTagIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      position: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (contact) {
        reset({
          email: contact.email,
          firstName: contact.firstName ?? "",
          lastName: contact.lastName ?? "",
          company: contact.company ?? "",
          position: contact.position ?? "",
        });
        setTagIds(contact.tags.map((t) => t.id));
      } else {
        reset({
          email: "",
          firstName: "",
          lastName: "",
          company: "",
          position: "",
        });
        setTagIds([]);
      }
    }
  }, [open, contact, reset]);

  const onSubmit = async (data: ContactFormData) => {
    await onSave({
      id: contact?.id,
      email: data.email,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
      company: data.company || undefined,
      position: data.position || undefined,
      tagIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-950 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {contact ? "Editar contacto" : "Nuevo contacto"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {contact
              ? "Modificá los datos del contacto"
              : "Completá los datos del nuevo contacto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@ejemplo.com"
              {...register("email")}
              className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Nombre / Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-slate-300">
                Nombre
              </Label>
              <Input
                id="firstName"
                placeholder="Juan"
                {...register("firstName")}
                className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-slate-300">
                Apellido
              </Label>
              <Input
                id="lastName"
                placeholder="Pérez"
                {...register("lastName")}
                className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Empresa / Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-slate-300">
                Empresa
              </Label>
              <Input
                id="company"
                placeholder="Acme Corp"
                {...register("company")}
                className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-slate-300">
                Cargo
              </Label>
              <Input
                id="position"
                placeholder="Gerente"
                {...register("position")}
                className="border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-slate-300">Tags</Label>
            <TagMultiselect
              selectedIds={tagIds}
              onChange={setTagIds}
              allowCreate
            />
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
              {saving ? "Guardando..." : contact ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
