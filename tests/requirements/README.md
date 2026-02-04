# Tests de Requirements

Este directorio contiene tests que expresan **expectativas del producto** basadas en la documentación del sistema viejo y los requisitos de FAROandes.

## Propósito

- Los tests que **PASAN** indican features correctamente implementadas
- Los tests que **FALLAN** indican features faltantes o incompletas
- Ejecutar `pnpm test:requirements` te muestra el estado actual del cumplimiento

## Cómo interpretar los resultados

```bash
pnpm test:requirements
```

- **Verde**: El requisito está implementado y funciona
- **Rojo**: El requisito está pendiente de implementación

## Organización

- `signature.test.ts` - Firma HTML global y override por campaña
- `sending-controls.test.ts` - Límites, horarios y pacing de envío
- `contact-filtering.test.ts` - Reglas de exclusión y deduplicación
- `email-auditing.test.ts` - Permalink, tracking y trazabilidad

## Referencia de documentación

- `DOCUMENTACION_SISTEMA_COMPLETA.md` - Descripción del sistema viejo
- `DOCUMENTACION_GESTOR_CAMPANAS.md` - Flujos detallados del gestor
- `QA_REPORTE.md` - Gaps identificados en QA manual
