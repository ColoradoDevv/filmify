/**
 * Rutas internas seguras (SEC-016).
 *
 * Una ruta que venga de fuera —de `?next=`, de la respuesta de una API, de una
 * prop de componente— no puede meterse tal cual en un `href` ni en un redirect:
 *
 *   `javascript:alert(1)`  ejecuta al pulsar el enlace (XSS)
 *   `//evil.example`       el navegador lo lee como protocolo relativo y sale
 *                          del sitio (redirección abierta)
 *   `https://evil.example` lo mismo, explícito
 *
 * La comprobación estaba duplicada a mano en `login/actions.ts` y en
 * `middleware.ts`; vive aquí para que haya una sola versión y para que
 * cualquier sitio nuevo la reutilice en lugar de reescribirla.
 */

/** Origen ficticio para resolver rutas relativas de forma consistente. */
const ORIGIN = 'https://filmify.me';

/**
 * ¿Es `path` una ruta relativa a este mismo sitio?
 *
 * Solo acepta rutas que empiezan por una única `/`. Todo lo demás —esquemas,
 * protocolo relativo, la barra invertida que algunos navegadores normalizan a
 * `/`— se rechaza.
 */
export function isSafeInternalPath(path: unknown): path is string {
    if (typeof path !== 'string' || path.length === 0) return false;
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//') || path.startsWith('/\\')) return false;

    try {
        return new URL(path, ORIGIN).origin === ORIGIN;
    } catch {
        return false;
    }
}

/**
 * Devuelve una ruta interna segura, RECONSTRUIDA a partir de sus componentes.
 *
 * No devuelve la cadena de entrada aunque la considere válida: la parsea y la
 * vuelve a montar desde `pathname`, `search` y `hash`. Eso garantiza que la
 * salida es una ruta —nunca puede llevar esquema— sea cual sea la entrada, en
 * lugar de depender de que la comprobación previa haya contemplado todas las
 * formas de escribir un `javascript:`.
 *
 * De paso normaliza: `/a/./b` sale como `/a/b`, y la barra invertida que
 * algunos navegadores convierten en `/` queda resuelta aquí y no en el cliente.
 */
export function safeInternalPath(path: unknown, fallback = '/'): string {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
        return fallback;
    }

    try {
        const url = new URL(path, ORIGIN);
        if (url.origin !== ORIGIN) return fallback;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
