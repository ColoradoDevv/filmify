/**
 * Serializa datos estructurados para meterlos en un <script type="application/ld+json">.
 *
 * `JSON.stringify` NO escapa `<`, asi que una cadena que contenga `</script>`
 * cierra la etiqueta y todo lo que venga detras lo parsea el navegador como
 * HTML. En las fichas eso importa: el JSON-LD se construye con `title`,
 * `overview`, nombres del reparto y productoras que vienen de TMDB, que es
 * editable por su comunidad — es decir, entrada de terceros.
 *
 * Escapar `<` basta para cerrar el vector y deja el JSON valido: una vez
 * parseado, `<` vuelve a ser el mismo caracter. Se escapan tambien U+2028 y
 * U+2029, legales dentro de JSON pero que rompen un literal de JavaScript.
 *
 * Los dos separadores se obtienen con `String.fromCharCode` en lugar de
 * escribirlos: dentro de un literal de expresion regular cuentan como salto de
 * linea y dejarian este mismo archivo sin compilar.
 *
 * El repo ya lo hacia en la home y en /genero; faltaba en las otras cinco
 * paginas. Vive aqui para que no vuelva a olvidarse en la siguiente.
 */

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

// El texto de sustitucion son las SEIS letras `\u003c`, no el caracter que
// esa secuencia representa. Se compone con `String.fromCharCode(92)` porque la
// barra invertida escapada es justo el detalle que se cuela al editar y deja el
// reemplazo sin efecto — paso que ya ocurrio una vez aqui.
const BACKSLASH = String.fromCharCode(92);

export function serializeJsonLd(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, BACKSLASH + 'u003c')
        .split(LINE_SEPARATOR).join(BACKSLASH + 'u2028')
        .split(PARAGRAPH_SEPARATOR).join(BACKSLASH + 'u2029');
}
