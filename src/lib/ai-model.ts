/**
 * Fuente única del modelo de Groq usado en todo el sitio.
 *
 * Historial: `llama-3.3-70b-versatile` se retiró el 2026-08-16 y todas las
 * llamadas empezaron a devolver 404 `model_not_found` en producción. Groq
 * recomienda `openai/gpt-oss-120b` como reemplazo directo
 * (https://console.groq.com/docs/deprecations). Cuando vuelva a retirarse un
 * modelo, este archivo es el único sitio que hay que tocar.
 */
export const GROQ_MODEL = 'openai/gpt-oss-120b';

/**
 * gpt-oss es un modelo de razonamiento: genera tokens de "thinking" que
 * cuentan contra `max_completion_tokens` y que, sin `reasoning_format`, se
 * cuelan en el contenido. Todos nuestros parsers leen `message.content` en
 * crudo (títulos, IDs de YouTube, JSON), así que:
 *  - `reasoning_effort: 'low'` para no gastar el presupuesto en razonar
 *    (el default de gpt-oss es 'medium'),
 *  - `reasoning_format: 'hidden'` para que el razonamiento no aparezca en
 *    `content`.
 */
export const GROQ_REASONING_OPTS = {
    reasoning_effort: 'low',
    reasoning_format: 'hidden',
} as const;
