#!/bin/bash
# Poda del Data Cache de fetch de Next POR TAMAÑO, no por edad.
#
# Por qué: cada fetch con `next: { revalidate }` a TMDB/AniList/proveedores
# escribe una entrada en .next/cache/fetch-cache. El handler de caché de Next
# NO purga nunca esas entradas por su cuenta: solo las pisa si la MISMA clave
# se vuelve a pedir. Con miles de ids de catálogo, búsquedas y sondas por
# título que se visitan una vez y no se repiten, el directorio crece sin
# límite (medido: ~900 MB/día, 26k entradas/día a finales de agosto de 2026).
# Una poda por edad (mtime +N días) solo retrasa el problema: acumula N días
# de crecimiento antes de actuar. Esta poda actúa por TAMAÑO: mantiene el
# directorio bajo un techo fijo pase lo que pase con el tráfico, borrando
# primero los ficheros con el mtime más antiguo (el propio nombre es un hash
# de la clave de caché — no hay forma de saber la "última lectura" real sin
# tocar el código de la app, así que el mtime de escritura es la mejor señal
# disponible sin más instrumentación).
#
# Uso: cron cada 15-30 min (ver crontab). Solo escribe en el log si podó algo.
set -euo pipefail

CACHE_DIR="/home/ubuntu/filmify/.next/cache/fetch-cache"
MAX_BYTES=$((1536 * 1024 * 1024))    # techo: 1.5 GiB
TARGET_BYTES=$((1280 * 1024 * 1024)) # al podar, bajar hasta 1.25 GiB (histéresis)
LOG="/home/ubuntu/logs/prune-fetch-cache.log"

[ -d "$CACHE_DIR" ] || exit 0

total=$(du -sb "$CACHE_DIR" 2>/dev/null | cut -f1)
[ -z "${total:-}" ] && exit 0
[ "$total" -le "$MAX_BYTES" ] && exit 0

before=$total
freed=0
deleted=0

while IFS=$'\t' read -r mtime size path; do
    [ "$total" -le "$TARGET_BYTES" ] && break
    rm -f -- "$path" 2>/dev/null || continue
    total=$((total - size))
    freed=$((freed + size))
    deleted=$((deleted + 1))
done < <(find "$CACHE_DIR" -maxdepth 1 -type f -printf '%T@\t%s\t%p\n' | sort -n)

find "$CACHE_DIR" -maxdepth 1 -type d -empty ! -path "$CACHE_DIR" -delete 2>/dev/null || true

if [ "$deleted" -gt 0 ]; then
    mkdir -p "$(dirname "$LOG")"
    printf '[%s] antes=%dMB despues=%dMB podados=%d liberados=%dMB\n' \
        "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        "$((before / 1024 / 1024))" \
        "$((total / 1024 / 1024))" \
        "$deleted" \
        "$((freed / 1024 / 1024))" >> "$LOG"
fi
