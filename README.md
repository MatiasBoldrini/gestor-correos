# Gestor de Correos

Sistema de gestión de campañas de email para Gmail.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Estilos**: Tailwind CSS 4 + shadcn/ui
- **Auth/DB**: Supabase (Auth con Google + Postgres)
- **Iconos**: Tabler Icons

## Configuración inicial

### 1. Variables de entorno

Copiá `env.example` a `.env.local` y completá las variables:

```bash
cp env.example .env.local
```

### 2. Configurar Supabase

1. Creá un proyecto en [Supabase](https://supabase.com)
2. Obtené las credenciales desde Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key - para el cliente)
   - `SUPABASE_SECRET_KEY` (secret key - para el servidor)

### 3. Configurar Google OAuth

1. Andá a [Google Cloud Console](https://console.cloud.google.com)
2. Creá un proyecto nuevo o usá uno existente
3. Habilitá la Gmail API
4. Creá credenciales OAuth 2.0:
   - Tipo: Web application
   - Authorized redirect URI: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
5. Agregá los scopes de Gmail:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Copiá el Client ID y Client Secret a las variables de entorno:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 4. Configurar Provider en Supabase

1. En Supabase Dashboard: Authentication > Providers > Google
2. Activá el provider y pegá Client ID y Secret
3. Agregá los scopes adicionales de Gmail

### 5. Configurar Upstash QStash (para envío programado)

1. Creá una cuenta en [Upstash](https://upstash.com)
2. Creá un proyecto QStash
3. Obtené las credenciales:
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`

### 6. Ejecutar migraciones

Ejecutá los archivos SQL en `supabase/migrations/` desde el SQL Editor de Supabase (en orden).

### 7. Ejecutar la app

```bash
pnpm install
pnpm dev
```

La app estará disponible en http://localhost:3000

## Estructura del proyecto

```
app/
├── (app)/           # Rutas protegidas (dashboard, contactos, etc.)
├── (auth)/          # Login
├── (public)/        # Páginas públicas (unsubscribe)
└── api/             # Route handlers

components/
├── ui/              # Componentes shadcn
├── app-sidebar.tsx
└── app-header.tsx

lib/
└── supabase/        # Clientes Supabase

server/
├── auth/            # Validación de sesión
├── contracts/       # Schemas Zod y tipos
├── domain/          # Lógica de negocio pura (templating, scheduler)
├── integrations/    # DB repos, Gmail API, QStash
└── services/        # Casos de uso (CampaignService, etc.)

supabase/
└── migrations/      # Schema SQL
```

## Fases implementadas

- **Fase 1**: Fundación (Next.js + Tailwind + shadcn/ui + Supabase Auth)
- **Fase 2**: CRUD contactos + tags + segmentación
- **Fase 3**: Plantillas HTML + preview
- **Fase 4**: Campañas + snapshot + pruebas
- **Fase 5**: QStash + SendTick + envío con Gmail API

## Próximas fases

- **Fase 6**: Unsubscribe público
- **Fase 7**: Rebotes + supresión
