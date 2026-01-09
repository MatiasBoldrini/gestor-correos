import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IconUsers,
  IconTemplate,
  IconSend,
  IconMailFast,
  IconPlayerPlay,
  IconPlayerPause,
  IconExternalLink,
} from "@tabler/icons-react";
import Link from "next/link";
import {
  getDashboardStats,
  getActiveCampaign,
} from "@/server/services/DashboardService";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const activeCampaign = await getActiveCampaign();

  const statCards = [
    {
      title: "Contactos",
      value: stats.contactsCount.toString(),
      description: "Total de contactos activos",
      icon: IconUsers,
      color: "from-blue-500 to-blue-600",
      href: "/contacts",
    },
    {
      title: "Plantillas",
      value: stats.templatesCount.toString(),
      description: "Plantillas creadas",
      icon: IconTemplate,
      color: "from-emerald-500 to-emerald-600",
      href: "/templates",
    },
    {
      title: "Campañas",
      value: stats.campaignsCount.toString(),
      description: "Campañas totales",
      icon: IconSend,
      color: "from-violet-500 to-violet-600",
      href: "/campaigns",
    },
    {
      title: "Enviados hoy",
      value: stats.sentTodayCount.toString(),
      description: "Correos enviados hoy",
      icon: IconMailFast,
      color: "from-amber-500 to-amber-600",
      href: "/campaigns",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Bienvenido al gestor de campañas de email
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700 hover:bg-slate-900/70">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <div
                  className={`rounded-lg bg-gradient-to-br ${stat.color} p-2`}
                >
                  <stat.icon className="h-4 w-4 text-white" stroke={2} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-slate-500">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Sección de campaña activa */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Campaña activa</CardTitle>
        </CardHeader>
        <CardContent>
          {activeCampaign ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeCampaign.status === "sending" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                      <IconPlayerPlay className="h-5 w-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                      <IconPlayerPause className="h-5 w-5 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      {activeCampaign.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {activeCampaign.templateName ?? "Sin plantilla"}
                    </p>
                  </div>
                </div>
                <Link href={`/campaigns/${activeCampaign.id}`}>
                  <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    <IconExternalLink className="mr-2 h-4 w-4" />
                    Ver detalles
                  </Button>
                </Link>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progreso</span>
                  <span className="text-white">
                    {activeCampaign.sentCount} / {activeCampaign.totalDrafts} enviados
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                    style={{
                      width: `${
                        activeCampaign.totalDrafts > 0
                          ? (activeCampaign.sentCount / activeCampaign.totalDrafts) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    {activeCampaign.status === "sending" ? "Enviando..." : "Pausada"}
                  </span>
                  <span>{activeCampaign.pendingCount} pendientes</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconSend className="h-12 w-12 text-slate-600" stroke={1} />
              <p className="mt-4 text-slate-400">
                No hay campañas activas en este momento
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Creá una campaña desde la sección Campañas
              </p>
              <Link href="/campaigns" className="mt-4">
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Ir a Campañas
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
