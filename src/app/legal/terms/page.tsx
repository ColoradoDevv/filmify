import React from 'react';
import { AlertTriangle, XCircle, ShieldAlert, Ban, Fingerprint, Mail, UserMinus, ShieldOff, Info } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold mb-2">Términos y Condiciones de Uso</h1>
                <p className="text-gray-400">
                    Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">1. Aceptación de los Términos</h2>
                <p className="text-gray-300">
                    Bienvenido a FilmiFy. Al acceder o utilizar nuestra plataforma, sitio web, aplicaciones y servicios (colectivamente, "el Servicio"), aceptas estar legalmente vinculado por estos Términos y Condiciones ("Términos"). Si no estás de acuerdo con alguna parte de estos Términos, no debes utilizar nuestro Servicio.
                </p>
                <p className="text-gray-300">
                    Estos Términos constituyen un acuerdo legal entre tú ("Usuario", "tú" o "tu") y FilmiFy ("nosotros", "nuestro" o "la Plataforma"). Al crear una cuenta o utilizar el Servicio, confirmas que tienes al menos 13 años de edad y que tienes la capacidad legal para celebrar este acuerdo.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">2. Descripción del Servicio</h2>
                <p className="text-gray-300">
                    FilmiFy es una plataforma de descubrimiento y organización de contenido cinematográfico que proporciona:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Información sobre películas y series de televisión (metadatos, imágenes, trailers, sinopsis).</li>
                    <li>Herramientas para crear listas personalizadas y gestionar tu biblioteca de contenido.</li>
                    <li>Sistema de reseñas y calificaciones de películas y series.</li>
                    <li>Recomendaciones personalizadas mediante inteligencia artificial.</li>
                    <li>Funcionalidad de "Watch Party" para visualización sincronizada de trailers con otros usuarios.</li>
                </ul>

                <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/30 mt-4">
                    <p className="font-medium text-yellow-500 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        AVISO LEGAL IMPORTANTE
                    </p>
                    <p className="text-gray-300 text-sm">
                        <strong>FilmiFy NO aloja, almacena, transmite ni distribuye archivos de video, películas completas o series de televisión en sus servidores.</strong>
                    </p>
                    <p className="text-gray-300 text-sm mt-2">
                        Nuestra plataforma funciona exclusivamente como un <strong>índice de información pública</strong> y una herramienta de organización personal. Todo el contenido multimedia (metadatos, imágenes, descripciones, trailers) es proporcionado por servicios de terceros, principalmente The Movie Database (TMDB) y YouTube. FilmiFy no tiene control sobre este contenido y no asume responsabilidad por su exactitud, disponibilidad o legalidad.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">3. Cuentas de Usuario</h2>

                <h3 className="text-xl font-semibold text-white mt-4">3.1 Registro</h3>
                <p className="text-gray-300">
                    Para acceder a ciertas funciones del Servicio, debes crear una cuenta. Al registrarte, aceptas:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Proporcionar información precisa, actual y completa.</li>
                    <li>Mantener actualizada tu información de cuenta.</li>
                    <li>Mantener la confidencialidad de tu contraseña.</li>
                    <li>Notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.</li>
                    <li>Ser responsable de todas las actividades que ocurran bajo tu cuenta.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">3.2 Elegibilidad</h3>
                <p className="text-gray-300">
                    Debes tener al menos 13 años para crear una cuenta. Los usuarios menores de 18 años deben obtener el consentimiento de un padre o tutor legal antes de usar el Servicio.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">3.3 Suspensión y Terminación</h3>
                <p className="text-gray-300">
                    Nos reservamos el derecho de suspender o terminar tu cuenta, a nuestra entera discreción y sin previo aviso, si:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Violas estos Términos o nuestra Política de Privacidad.</li>
                    <li>Participas en actividades fraudulentas, abusivas o ilegales.</li>
                    <li>Proporcionas información falsa o engañosa.</li>
                    <li>Intentas comprometer la seguridad de la plataforma.</li>
                    <li>Acosas, amenazas o dañas a otros usuarios.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">4. Uso Aceptable</h2>
                <p className="text-gray-300">
                    Al utilizar FilmiFy, te comprometes a NO:
                </p>

                <div className="space-y-3 mt-4">
                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <Ban className="w-4 h-4" />
                            Actividades Ilegales
                        </h4>
                        <p className="text-gray-300 text-sm">Utilizar el Servicio para cualquier propósito ilegal o no autorizado, incluyendo la violación de leyes locales, estatales, nacionales o internacionales.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <ShieldOff className="w-4 h-4" />
                            Violación de Seguridad
                        </h4>
                        <p className="text-gray-300 text-sm">Intentar obtener acceso no autorizado a cuentas de otros usuarios, servidores, redes o sistemas informáticos conectados al Servicio.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <Fingerprint className="w-4 h-4" />
                            Scraping y Automatización
                        </h4>
                        <p className="text-gray-300 text-sm">Realizar scraping, crawling, o recolección automatizada de datos sin nuestro permiso expreso por escrito. Esto incluye el uso de bots, spiders o herramientas automatizadas.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <UserMinus className="w-4 h-4" />
                            Contenido Ofensivo
                        </h4>
                        <p className="text-gray-300 text-sm">Publicar, transmitir o compartir contenido que sea difamatorio, obsceno, pornográfico, abusivo, ofensivo, discriminatorio, que incite al odio o que viole los derechos de terceros.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Spam y Phishing
                        </h4>
                        <p className="text-gray-300 text-sm">Enviar spam, correos electrónicos no solicitados, esquemas piramidales, o participar en actividades de phishing.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Ingeniería Inversa
                        </h4>
                        <p className="text-gray-300 text-sm">Realizar ingeniería inversa, descompilar, desensamblar o intentar derivar el código fuente de cualquier parte del Servicio.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <UserMinus className="w-4 h-4" />
                            Suplantación de Identidad
                        </h4>
                        <p className="text-gray-300 text-sm">Hacerse pasar por otra persona, entidad u organización, o falsificar tu afiliación con cualquier persona o entidad.</p>
                    </div>

                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                        <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Interferencia con el Servicio
                        </h4>
                        <p className="text-gray-300 text-sm">Interferir o interrumpir el funcionamiento del Servicio, servidores o redes, incluyendo la introducción de virus, malware o código malicioso.</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">5. Propiedad Intelectual</h2>

                <h3 className="text-xl font-semibold text-white mt-4">5.1 Contenido de FilmiFy</h3>
                <p className="text-gray-300">
                    El Servicio, incluyendo su diseño, código fuente, logotipos, marcas comerciales, gráficos y otros contenidos originales creados por FilmiFy, están protegidos por derechos de autor, marcas registradas y otras leyes de propiedad intelectual. Todos los derechos no otorgados expresamente están reservados.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">5.2 Contenido de Terceros (TMDB, YouTube, etc.)</h3>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-gray-300">
                        Todo el contenido relacionado con películas y series (metadatos, imágenes, descripciones, trailers, pósters) es proporcionado por servicios de terceros, principalmente:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300 mt-2">
                        <li><strong>The Movie Database (TMDB):</strong> Metadatos, imágenes y descripciones de películas y series.</li>
                        <li><strong>YouTube:</strong> Trailers y contenido de video embebido.</li>
                    </ul>
                    <p className="text-gray-300 mt-3">
                        <strong>FilmiFy no reclama propiedad sobre este contenido.</strong> Los derechos de propiedad intelectual pertenecen a sus respectivos propietarios (estudios de cine, distribuidores, TMDB, etc.). FilmiFy actúa únicamente como un agregador de información pública disponible a través de APIs oficiales.
                    </p>
                </div>

                <h3 className="text-xl font-semibold text-white mt-4">5.3 Contenido Generado por Usuarios</h3>
                <p className="text-gray-300">
                    Al publicar reseñas, comentarios, listas u otro contenido en FilmiFy, otorgas a FilmiFy una licencia mundial, no exclusiva, libre de regalías, sublicenciable y transferible para usar, reproducir, distribuir, preparar trabajos derivados, mostrar y ejecutar dicho contenido en relación con el Servicio.
                </p>
                <p className="text-gray-300 mt-2">
                    Conservas todos los derechos de propiedad sobre tu contenido, pero garantizas que tienes todos los derechos necesarios para otorgar esta licencia y que tu contenido no infringe los derechos de terceros.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">5.4 Reclamos de Infracción de Derechos de Autor (DMCA)</h3>
                <p className="text-gray-300">
                    Si crees que tu trabajo protegido por derechos de autor ha sido copiado de manera que constituye una infracción, contáctanos proporcionando:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Identificación del trabajo protegido por derechos de autor.</li>
                    <li>Identificación del material infractor y su ubicación en el Servicio.</li>
                    <li>Tu información de contacto.</li>
                    <li>Una declaración de buena fe de que el uso no está autorizado.</li>
                    <li>Una declaración bajo pena de perjurio de que la información es precisa.</li>
                    <li>Tu firma física o electrónica.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">6. Contenido de Usuario y Moderación</h2>
                <p className="text-gray-300">
                    Nos reservamos el derecho, pero no la obligación, de:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Monitorear, revisar, editar o eliminar cualquier contenido de usuario que viole estos Términos.</li>
                    <li>Eliminar reseñas que contengan spam, lenguaje ofensivo o información falsa.</li>
                    <li>Tomar medidas contra usuarios que abusen del sistema de reseñas o calificaciones.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    No somos responsables del contenido publicado por los usuarios y no respaldamos ninguna opinión expresada por ellos.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">7. Servicios de Terceros</h2>
                <p className="text-gray-300">
                    El Servicio puede contener enlaces a sitios web, servicios o recursos de terceros. No controlamos ni respaldamos estos sitios y no somos responsables de:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>La disponibilidad o exactitud de dichos sitios o recursos.</li>
                    <li>El contenido, productos o servicios disponibles en dichos sitios.</li>
                    <li>Las prácticas de privacidad de terceros.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Tu uso de servicios de terceros está sujeto a sus propios términos y condiciones.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">8. Privacidad y Protección de Datos</h2>
                <p className="text-gray-300">
                    Tu privacidad es importante para nosotros. Nuestra recopilación y uso de información personal está regida por nuestra <a href="/legal/privacy" className="text-primary hover:underline font-semibold">Política de Privacidad</a>, que forma parte integral de estos Términos.
                </p>
                <p className="text-gray-300">
                    Al utilizar el Servicio, consientes la recopilación, uso y divulgación de tu información según se describe en la Política de Privacidad.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">9. Exención de Garantías</h2>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-gray-300 uppercase font-semibold mb-2">
                        EL SERVICIO SE PROPORCIONA "TAL CUAL" Y "SEGÚN DISPONIBILIDAD", SIN GARANTÍAS DE NINGÚN TIPO.
                    </p>
                    <p className="text-gray-300 text-sm">
                        FilmiFy y sus proveedores renuncian expresamente a todas las garantías, ya sean expresas, implícitas o estatutarias, incluyendo, entre otras:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm mt-2">
                        <li>Garantías de comerciabilidad, idoneidad para un propósito particular y no infracción.</li>
                        <li>Garantías de que el Servicio será ininterrumpido, oportuno, seguro o libre de errores.</li>
                        <li>Garantías sobre la exactitud, confiabilidad o integridad del contenido.</li>
                        <li>Garantías de que los defectos serán corregidos.</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-3">
                        No garantizamos que el Servicio satisfaga tus requisitos o que esté disponible en todo momento. El uso del Servicio es bajo tu propio riesgo.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">10. Limitación de Responsabilidad</h2>
                <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/30">
                    <p className="text-gray-300 uppercase font-semibold mb-2">
                        EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY APLICABLE:
                    </p>
                    <p className="text-gray-300 text-sm">
                        FilmiFy, sus directores, empleados, agentes, socios y proveedores NO SERÁN RESPONSABLES de:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300 text-sm mt-2">
                        <li>Daños indirectos, incidentales, especiales, consecuentes o punitivos.</li>
                        <li>Pérdida de beneficios, ingresos, datos, uso, buena voluntad u otras pérdidas intangibles.</li>
                        <li>Daños resultantes de tu acceso, uso o incapacidad de usar el Servicio.</li>
                        <li>Daños resultantes de conducta o contenido de terceros en el Servicio.</li>
                        <li>Acceso no autorizado, uso o alteración de tus transmisiones o contenido.</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-3">
                        Nuestra responsabilidad total hacia ti por todas las reclamaciones relacionadas con el Servicio no excederá la cantidad que hayas pagado a FilmiFy en los últimos 12 meses, o $100 USD, lo que sea mayor.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">11. Indemnización</h2>
                <p className="text-gray-300">
                    Aceptas indemnizar, defender y eximir de responsabilidad a FilmiFy, sus afiliados, directores, empleados, agentes y proveedores de y contra todas las reclamaciones, responsabilidades, daños, pérdidas, costos, gastos y honorarios (incluyendo honorarios razonables de abogados) que surjan de o estén relacionados con:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Tu violación de estos Términos.</li>
                    <li>Tu violación de cualquier ley o los derechos de terceros.</li>
                    <li>Tu uso o mal uso del Servicio.</li>
                    <li>Contenido que publiques o transmitas a través del Servicio.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">12. Modificaciones del Servicio y los Términos</h2>

                <h3 className="text-xl font-semibold text-white mt-4">12.1 Modificaciones del Servicio</h3>
                <p className="text-gray-300">
                    Nos reservamos el derecho de modificar, suspender o descontinuar el Servicio (o cualquier parte del mismo) en cualquier momento, con o sin previo aviso. No seremos responsables ante ti ni ante terceros por cualquier modificación, suspensión o descontinuación del Servicio.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">12.2 Modificaciones de los Términos</h3>
                <p className="text-gray-300">
                    Podemos actualizar estos Términos ocasionalmente. Te notificaremos sobre cambios significativos mediante:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Un aviso destacado en la plataforma.</li>
                    <li>Un correo electrónico a tu dirección registrada.</li>
                    <li>Actualización de la fecha de "Última actualización" al inicio de estos Términos.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Tu uso continuado del Servicio después de la publicación de cambios constituye tu aceptación de los Términos modificados. Si no estás de acuerdo con los cambios, debes dejar de usar el Servicio y eliminar tu cuenta.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">13. Resolución de Disputas</h2>

                <h3 className="text-xl font-semibold text-white mt-4">13.1 Ley Aplicable</h3>
                <p className="text-gray-300">
                    Estos Términos se regirán e interpretarán de acuerdo con las leyes del país o jurisdicción donde FilmiFy esté registrado, sin dar efecto a ningún principio de conflicto de leyes.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">13.2 Resolución Informal</h3>
                <p className="text-gray-300">
                    Antes de presentar una reclamación formal, aceptas intentar resolver la disputa de manera informal contactándonos a través de nuestro formulario de contacto. Intentaremos resolver la disputa de buena fe.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">13.3 Arbitraje</h3>
                <p className="text-gray-300">
                    Si no podemos resolver una disputa de manera informal, cualquier disputa, controversia o reclamación que surja de o esté relacionada con estos Términos será resuelta mediante arbitraje vinculante, excepto que cualquiera de las partes pueda buscar medidas cautelares en un tribunal competente.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">14. Disposiciones Generales</h2>

                <h3 className="text-xl font-semibold text-white mt-4">14.1 Acuerdo Completo</h3>
                <p className="text-gray-300">
                    Estos Términos, junto con nuestra Política de Privacidad, constituyen el acuerdo completo entre tú y FilmiFy con respecto al Servicio y reemplazan todos los acuerdos anteriores.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">14.2 Divisibilidad</h3>
                <p className="text-gray-300">
                    Si alguna disposición de estos Términos se considera inválida o inaplicable, dicha disposición se modificará e interpretará para lograr los objetivos de dicha disposición en la mayor medida posible, y las disposiciones restantes continuarán en pleno vigor y efecto.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">14.3 Renuncia</h3>
                <p className="text-gray-300">
                    Ninguna renuncia por parte de FilmiFy a cualquier término o condición establecida en estos Términos se considerará una renuncia adicional o continua de dicho término o condición.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">14.4 Cesión</h3>
                <p className="text-gray-300">
                    No puedes ceder o transferir estos Términos, por ley o de otro modo, sin nuestro consentimiento previo por escrito. Podemos ceder estos Términos sin restricciones.
                </p>

                <h3 className="text-xl font-semibold text-white mt-4">14.5 Supervivencia</h3>
                <p className="text-gray-300">
                    Las disposiciones de estos Términos que por su naturaleza deban sobrevivir a la terminación (incluyendo, entre otras, las disposiciones de propiedad, exenciones de garantía, indemnización y limitaciones de responsabilidad) sobrevivirán a la terminación de estos Términos.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">15. Contacto</h2>
                <p className="text-gray-300">
                    Si tienes preguntas, comentarios o inquietudes sobre estos Términos y Condiciones, puedes contactarnos a través de:
                </p>
                <ul className="list-none space-y-2 ml-4 text-gray-300">
                    <li><strong>Formulario de contacto:</strong> Disponible en <a href="/contact" className="text-primary hover:underline">/contact</a></li>
                    <li><strong>Email:</strong> <a href="mailto:legal@filmify.com" className="text-primary hover:underline">legal@filmify.com</a></li>
                </ul>
            </section>

            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border border-primary/20 mt-8">
                <p className="text-sm text-gray-300">
                    Al utilizar FilmiFy, reconoces que has leído, entendido y aceptado estar legalmente vinculado por estos Términos y Condiciones. Si no aceptas estos Términos, no debes acceder ni utilizar nuestro Servicio.
                </p>
                <p className="text-sm text-gray-300 mt-3 font-semibold">
                    Gracias por ser parte de la comunidad FilmiFy. ¡Disfruta del cine! 🎬
                </p>
            </div>
        </div>
    );
}
