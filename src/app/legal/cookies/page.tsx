import React from 'react';
import { Lock, Settings, BarChart, Shield, AlertTriangle } from 'lucide-react';

export default function CookiesPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold mb-2">Política de Cookies</h1>
                <p className="text-gray-400">
                    Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">1. ¿Qué son las Cookies?</h2>
                <p className="text-gray-300">
                    Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o móvil) cuando visitas un sitio web. Las cookies permiten que el sitio web reconozca tu dispositivo y recuerde información sobre tu visita, como tus preferencias y configuraciones.
                </p>
                <p className="text-gray-300">
                    FilmiFy utiliza cookies y tecnologías similares para mejorar tu experiencia de usuario, mantener la seguridad de la plataforma y analizar cómo se utiliza nuestro servicio.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">2. Tipos de Cookies que Utilizamos</h2>

                <div className="space-y-4 mt-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Cookies Estrictamente Necesarias
                        </h3>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Propósito:</strong> Estas cookies son esenciales para que puedas navegar por el sitio web y utilizar sus funciones básicas.
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Ejemplos:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm">
                            <li><strong>Cookies de autenticación:</strong> Mantienen tu sesión activa cuando inicias sesión.</li>
                            <li><strong>Cookies de seguridad:</strong> Protegen contra ataques CSRF y otras amenazas de seguridad.</li>
                            <li><strong>Cookies de sesión:</strong> Permiten que el sitio recuerde tus acciones durante una sesión de navegación.</li>
                        </ul>
                        <p className="text-gray-300 text-sm mt-2">
                            <strong>¿Se pueden desactivar?</strong> No. Sin estas cookies, el sitio web no puede funcionar correctamente.
                        </p>
                        <p className="text-gray-300 text-sm">
                            <strong>Duración:</strong> Sesión (se eliminan al cerrar el navegador) o hasta que cierres sesión.
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary" />
                            Cookies de Preferencias
                        </h3>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Propósito:</strong> Estas cookies permiten que el sitio web recuerde tus preferencias y configuraciones personalizadas.
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Ejemplos:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm">
                            <li><strong>Preferencias de idioma:</strong> Recuerdan tu idioma preferido.</li>
                            <li><strong>Configuración de reproducción:</strong> Recuerdan si prefieres reproducir trailers automáticamente.</li>
                            <li><strong>Tema visual:</strong> Recuerdan tus preferencias de visualización (modo oscuro/claro).</li>
                        </ul>
                        <p className="text-gray-300 text-sm mt-2">
                            <strong>¿Se pueden desactivar?</strong> Sí, pero esto puede afectar tu experiencia de usuario, ya que tendrás que configurar tus preferencias cada vez que visites el sitio.
                        </p>
                        <p className="text-gray-300 text-sm">
                            <strong>Duración:</strong> Hasta 1 año o hasta que las elimines manualmente.
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                            <BarChart className="w-5 h-5 text-primary" />
                            Cookies Analíticas
                        </h3>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Propósito:</strong> Estas cookies nos ayudan a entender cómo los usuarios interactúan con nuestro sitio web, qué páginas visitan y qué contenido es más popular.
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Proveedores:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm">
                            <li><strong>Vercel Analytics:</strong> Recopila datos anónimos sobre el rendimiento del sitio y el comportamiento del usuario.</li>
                            <li><strong>Vercel Speed Insights:</strong> Mide la velocidad de carga y el rendimiento de las páginas.</li>
                        </ul>
                        <p className="text-gray-300 text-sm mt-2">
                            <strong>Información recopilada:</strong> Páginas visitadas, tiempo en el sitio, fuente de referencia, tipo de dispositivo, ubicación geográfica aproximada (a nivel de ciudad/país).
                        </p>
                        <p className="text-gray-300 text-sm mt-2">
                            <strong>¿Se pueden desactivar?</strong> Sí. Puedes desactivar estas cookies en la configuración de tu navegador o mediante herramientas de privacidad.
                        </p>
                        <p className="text-gray-300 text-sm">
                            <strong>Duración:</strong> Hasta 2 años.
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Cookies de Seguridad
                        </h3>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Propósito:</strong> Proteger la plataforma contra bots, spam y actividades maliciosas.
                        </p>
                        <p className="text-gray-300 text-sm mb-2">
                            <strong>Proveedores:</strong>
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm">
                            <li><strong>hCaptcha:</strong> Verifica que eres un humano y no un bot durante el registro y el inicio de sesión.</li>
                        </ul>
                        <p className="text-gray-300 text-sm mt-2">
                            <strong>¿Se pueden desactivar?</strong> No se recomienda, ya que esto puede afectar la seguridad de tu cuenta y la plataforma.
                        </p>
                        <p className="text-gray-300 text-sm">
                            <strong>Duración:</strong> Variable, según el proveedor.
                        </p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">3. Cookies de Terceros</h2>
                <p className="text-gray-300">
                    Algunos de nuestros proveedores de servicios pueden establecer sus propias cookies cuando utilizas FilmiFy. No tenemos control sobre estas cookies de terceros.
                </p>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mt-4">
                    <h4 className="font-semibold text-white mb-2">Proveedores de Terceros</h4>
                    <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300 text-sm">
                        <li>
                            <strong>Supabase:</strong> Cookies de autenticación y sesión.
                            <br />
                            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Política de Cookies de Supabase</a>
                        </li>
                        <li>
                            <strong>Vercel:</strong> Cookies analíticas y de rendimiento.
                            <br />
                            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Política de Cookies de Vercel</a>
                        </li>
                        <li>
                            <strong>hCaptcha:</strong> Cookies de seguridad y verificación.
                            <br />
                            <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Política de Cookies de hCaptcha</a>
                        </li>
                        <li>
                            <strong>Google (OAuth):</strong> Cookies de autenticación si inicias sesión con Google.
                            <br />
                            <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Política de Cookies de Google</a>
                        </li>
                    </ul>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">4. Tecnologías Similares</h2>
                <p className="text-gray-300">
                    Además de las cookies, también utilizamos otras tecnologías de almacenamiento local:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Local Storage:</strong> Almacena datos de forma persistente en tu navegador (por ejemplo, preferencias de usuario, estado de la aplicación).</li>
                    <li><strong>Session Storage:</strong> Almacena datos temporalmente durante una sesión de navegación.</li>
                    <li><strong>IndexedDB:</strong> Base de datos local para almacenar datos estructurados de forma más eficiente.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Estas tecnologías funcionan de manera similar a las cookies pero pueden almacenar más información y no se envían automáticamente al servidor con cada solicitud.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">5. Cómo Gestionar las Cookies</h2>

                <h3 className="text-xl font-semibold text-white mt-4">5.1 Configuración del Navegador</h3>
                <p className="text-gray-300">
                    Puedes controlar y/o eliminar las cookies según desees. Puedes eliminar todas las cookies que ya están en tu dispositivo y configurar la mayoría de los navegadores para evitar que se instalen.
                </p>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mt-4">
                    <h4 className="font-semibold text-white mb-2">Instrucciones por Navegador</h4>
                    <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300 text-sm">
                        <li>
                            <strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios
                            <br />
                            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Más información</a>
                        </li>
                        <li>
                            <strong>Mozilla Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio
                            <br />
                            <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Más información</a>
                        </li>
                        <li>
                            <strong>Safari:</strong> Preferencias → Privacidad → Cookies y datos de sitios web
                            <br />
                            <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Más información</a>
                        </li>
                        <li>
                            <strong>Microsoft Edge:</strong> Configuración → Cookies y permisos del sitio → Cookies y datos del sitio
                            <br />
                            <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Más información</a>
                        </li>
                    </ul>
                </div>

                <h3 className="text-xl font-semibold text-white mt-4">5.2 Herramientas de Privacidad</h3>
                <p className="text-gray-300">
                    También puedes utilizar herramientas de privacidad y extensiones de navegador para gestionar cookies:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Privacy Badger:</strong> Bloquea rastreadores y cookies de terceros.</li>
                    <li><strong>uBlock Origin:</strong> Bloqueador de anuncios y rastreadores.</li>
                    <li><strong>Ghostery:</strong> Detecta y bloquea rastreadores.</li>
                </ul>

                <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30 mt-4">
                    <p className="font-medium text-yellow-500 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Importante
                    </p>
                    <p className="text-gray-300 text-sm">
                        Si bloqueas o eliminas las cookies, es posible que algunas funciones de FilmiFy no funcionen correctamente. Por ejemplo, es posible que tengas que iniciar sesión cada vez que visites el sitio o que tus preferencias no se guarden.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">6. Cookies y Datos Personales</h2>
                <p className="text-gray-300">
                    Algunas cookies pueden contener información personal (por ejemplo, si guardas tu nombre de usuario). Tratamos toda la información recopilada a través de cookies de acuerdo con nuestra <a href="/legal/privacy" className="text-primary hover:underline font-semibold">Política de Privacidad</a>.
                </p>
                <p className="text-gray-300">
                    No utilizamos cookies para:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Recopilar información sensible sin tu consentimiento.</li>
                    <li>Compartir tus datos personales con terceros para fines publicitarios.</li>
                    <li>Rastrear tu actividad en otros sitios web (no utilizamos cookies de seguimiento entre sitios).</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">7. Actualizaciones de esta Política</h2>
                <p className="text-gray-300">
                    Podemos actualizar esta Política de Cookies ocasionalmente para reflejar cambios en las cookies que utilizamos o por razones operativas, legales o regulatorias.
                </p>
                <p className="text-gray-300">
                    Te recomendamos revisar esta página periódicamente para estar informado sobre cómo utilizamos las cookies. La fecha de "Última actualización" al inicio de esta política indica cuándo se realizó la última modificación.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">8. Más Información</h2>
                <p className="text-gray-300">
                    Si tienes preguntas sobre nuestra Política de Cookies o cómo utilizamos las cookies, puedes contactarnos:
                </p>
                <ul className="list-none space-y-2 ml-4 text-gray-300">
                    <li><strong>Formulario de contacto:</strong> <a href="/contact" className="text-primary hover:underline">/contact</a></li>
                    <li><strong>Email:</strong> <a href="mailto:privacy@filmify.com" className="text-primary hover:underline">privacy@filmify.com</a></li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Para más información sobre cookies en general, puedes visitar:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">All About Cookies</a></li>
                    <li><a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Your Online Choices</a></li>
                </ul>
            </section>

            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border border-primary/20 mt-8">
                <p className="text-sm text-gray-300">
                    Al continuar utilizando FilmiFy, aceptas el uso de cookies de acuerdo con esta Política de Cookies. Si no estás de acuerdo con el uso de cookies, puedes configurar tu navegador para rechazarlas, aunque esto puede afectar tu experiencia en la plataforma.
                </p>
            </div>
        </div>
    );
}
