# Componentes de publicidad

Ver `docs/ADSTERRA_SETUP.md` para la configuración de la red, las variables de
entorno, el `ads.txt` y el régimen de consentimiento.

## Qué hay aquí

- **`AdBanner.tsx`** — renderiza una zona de Adsterra en uno de sus cuatro
  formatos (`leaderboard` 728x90, `rectangle` 300x250, `mobile` 320x50,
  `native`). Gestiona el consentimiento, la inyección del tag y el evento de
  medición. No se usa directamente desde las páginas.
- **`AdSlot.tsx`** — el que se usa en las páginas. Elige el formato según el
  ancho real de pantalla y aplica el espaciado estándar.

## Reglas

1. **Una zona por hueco.** Nunca renderizar dos formatos y esconder uno con
   CSS: cuenta impresiones que nadie ve y las redes lo tratan como tráfico
   inválido.
2. **Máximo 2 unidades por vista.**
3. **Nada encima del reproductor ni del contenido principal.** El hueco bajo
   el player es el de más valor; encima solo estorba.
4. **Nunca en páginas de tarea** (login, registro, ajustes, contacto, panel de
   admin, donaciones): no generan ingresos y sí rompen conversiones.
