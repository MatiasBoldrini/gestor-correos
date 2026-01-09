"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDots, IconEye, IconTrash } from "@tabler/icons-react";
import type { Campaign, CampaignStatus } from "./types";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  ready: "Lista",
  sending: "Enviando",
  paused: "Pausada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<
  CampaignStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  ready: "secondary",
  sending: "default",
  paused: "secondary",
  completed: "default",
  cancelled: "destructive",
};

type CampaignsTableProps = {
  campaigns: Campaign[];
  loading?: boolean;
  onView: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
};

export function CampaignsTable({
  campaigns,
  loading,
  onView,
  onDelete,
}: CampaignsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-slate-400">No hay campañas todavía</p>
        <p className="mt-2 text-sm text-slate-500">
          Creá tu primera campaña seleccionando contactos y una plantilla
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Nombre</TableHead>
            <TableHead className="text-slate-400">Plantilla</TableHead>
            <TableHead className="text-slate-400">Estado</TableHead>
            <TableHead className="text-slate-400">Creada</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              className="cursor-pointer border-slate-800 hover:bg-slate-900/50"
              onClick={() => onView(campaign)}
            >
              <TableCell className="font-medium text-slate-200">
                {campaign.name}
              </TableCell>
              <TableCell className="text-slate-300">
                {campaign.templateName ?? (
                  <span className="text-slate-500">Sin plantilla</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANTS[campaign.status]}
                  className="text-xs"
                >
                  {STATUS_LABELS[campaign.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-400">
                {new Date(campaign.createdAt).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="border-slate-800 bg-slate-950"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(campaign);
                      }}
                      className="cursor-pointer text-slate-300 focus:bg-slate-800 focus:text-white"
                    >
                      <IconEye className="mr-2 h-4 w-4" />
                      Ver detalle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(campaign);
                      }}
                      className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
