"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconRefresh,
  IconMailOff,
  IconExternalLink,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { fetchBounces, scanBounces } from "./api";
import type { BounceEventResponse } from "./types";

const PAGE_SIZE = 25;

export function BouncesPage() {
  const [bounces, setBounces] = useState<BounceEventResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadBounces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBounces({ limit: PAGE_SIZE, offset });
      setBounces(data.bounces);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar rebotes");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    loadBounces();
  }, [loadBounces]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await scanBounces({
        maxResults: 100,
        newerThanDays: 30,
        trashProcessed: true,
      });

      if (result.created > 0) {
        toast.success(
          `Escaneo completado: ${result.scanned} mensajes, ${result.created} rebotes nuevos, ${result.suppressed} contactos suprimidos`
        );
        loadBounces();
      } else if (result.scanned > 0) {
        toast.info(`Escaneo completado: ${result.scanned} mensajes revisados, ningún rebote nuevo`);
      } else {
        toast.info("No se encontraron mensajes de rebote");
      }

      if (result.errors.length > 0) {
        console.warn("[BouncesPage] Errores durante escaneo:", result.errors);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al escanear rebotes");
    } finally {
      setScanning(false);
    }
  };

  const handlePageChange = (direction: "prev" | "next") => {
    const newOffset =
      direction === "prev"
        ? Math.max(0, offset - PAGE_SIZE)
        : offset + PAGE_SIZE;
    setOffset(newOffset);
  };

  // Pagination info
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Rebotes</h1>
          <p className="mt-1 text-slate-400">
            Detecta y gestiona emails rebotados
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={scanning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {scanning ? (
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" stroke={2} />
          ) : (
            <IconRefresh className="mr-2 h-4 w-4" stroke={2} />
          )}
          {scanning ? "Escaneando..." : "Escanear rebotes"}
        </Button>
      </div>

      {/* Table Card */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Rebotes detectados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
            </div>
          ) : bounces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <IconMailOff className="h-16 w-16 text-slate-600" stroke={1} />
              <p className="mt-4 text-lg text-slate-400">
                No hay rebotes detectados
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Ejecutá un escaneo para detectar emails rebotados en tu bandeja
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Fecha</TableHead>
                    <TableHead className="text-slate-400">Email rebotado</TableHead>
                    <TableHead className="text-slate-400">Motivo</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bounces.map((bounce) => (
                    <TableRow
                      key={bounce.id}
                      className="border-slate-800 hover:bg-slate-900/50"
                    >
                      <TableCell className="text-slate-300">
                        {formatDate(bounce.detectedAt)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-200">
                        {bounce.bouncedEmail.startsWith("unknown-") ? (
                          <span className="text-slate-500 italic">
                            No se pudo extraer
                          </span>
                        ) : (
                          bounce.bouncedEmail
                        )}
                      </TableCell>
                      <TableCell className="max-w-md text-slate-300">
                        <span
                          className="block truncate"
                          title={bounce.reason ?? undefined}
                        >
                          {bounce.reason ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {bounce.gmailPermalink && (
                          <a
                            href={bounce.gmailPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-slate-400 transition-colors hover:text-white"
                            title="Ver en Gmail"
                          >
                            <IconExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Mostrando {showingFrom}-{showingTo} de {total} rebotes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange("prev")}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange("next")}
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
