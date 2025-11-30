import React from 'react';

export default function PrivacyPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold mb-2">Política de Privacidad</h1>
                <p className="text-gray-400">
                    Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">1. Introducción</h2>
                <p className="text-gray-300">
                    En FilmiFy ("nosotros", "nuestro" o "la plataforma"), nos comprometemos a proteger tu privacidad y tus datos personales. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos tu información cuando utilizas nuestros servicios.
                </p>
                <p className="text-gray-300">
                    Al utilizar FilmiFy, aceptas las prácticas descritas en esta política. Si no estás de acuerdo con alguna parte de esta política, por favor no utilices nuestros servicios.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">2. Información que Recopilamos</h2>

                <h3 className="text-xl font-semibold text-white mt-4">2.1 Información de Cuenta</h3>
                <p className="text-gray-300">Cuando te registras en FilmiFy, recopilamos:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Nombre completo:</strong> Para personalizar tu experiencia.</li>
                    <li><strong>Dirección de correo electrónico:</strong> Para autenticación, comunicaciones importantes y recuperación de cuenta.</li>
                    <li><strong>Nombre de usuario:</strong> Para identificarte dentro de la plataforma.</li>
                    <li><strong>Contraseña:</strong> Almacenada de forma encriptada para proteger tu cuenta.</li>
                    <li><strong>Avatar/Foto de perfil:</strong> Si decides subir una imagen de perfil.</li>
                    <li><strong>Información de autenticación de terceros:</strong> Si decides iniciar sesión con Google, recopilamos tu ID de Google, nombre y correo electrónico asociado.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">2.2 Datos de Uso y Preferencias</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Listas de películas y series:</strong> Favoritos, contenido visto, y listas personalizadas que crees.</li>
                    <li><strong>Reseñas y calificaciones:</strong> Opiniones y puntuaciones que publiques sobre películas y series.</li>
                    <li><strong>Historial de navegación:</strong> Películas y series que visualizas en la plataforma.</li>
                    <li><strong>Preferencias de usuario:</strong> Configuraciones de idioma, reproducción automática de trailers, y otras preferencias personalizadas.</li>
                    <li><strong>Actividad en Watch Parties:</strong> Participación en salas de visualización compartida, incluyendo mensajes de chat y estado de reproducción.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">2.3 Información Técnica</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Dirección IP:</strong> Para seguridad, prevención de fraude y análisis geográfico.</li>
                    <li><strong>Tipo de navegador y dispositivo:</strong> Para optimizar la experiencia de usuario.</li>
                    <li><strong>Cookies y tecnologías similares:</strong> Para mantener tu sesión activa y recordar tus preferencias.</li>
                    <li><strong>Datos de rendimiento:</strong> Métricas de velocidad de carga y errores técnicos para mejorar el servicio.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">2.4 Información de Comunicaciones</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Mensajes de contacto:</strong> Cuando nos contactas a través del formulario de contacto.</li>
                    <li><strong>Suscripción a newsletter:</strong> Si te suscribes a nuestro boletín informativo.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">3. Servicios de Terceros</h2>
                <p className="text-gray-300">
                    FilmiFy utiliza servicios de terceros confiables para operar nuestra plataforma. Estos proveedores pueden tener acceso a ciertos datos necesarios para realizar sus funciones específicas:
                </p>

                <div className="space-y-4 mt-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Supabase (Infraestructura de Backend)</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Autenticación de usuarios, almacenamiento de base de datos, y gestión de archivos (avatares).<br />
                            <strong>Datos compartidos:</strong> Información de cuenta, listas, reseñas, y avatares.<br />
                            <strong>Ubicación:</strong> Servidores en la nube con cifrado en tránsito y en reposo.<br />
                            <strong>Política de privacidad:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/privacy</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">TMDB (The Movie Database)</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Obtener metadatos, imágenes, trailers e información sobre películas y series.<br />
                            <strong>Datos compartidos:</strong> Ningún dato personal. Solo consultas de búsqueda de contenido.<br />
                            <strong>Política de privacidad:</strong> <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.themoviedb.org/privacy-policy</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Groq AI</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Generar recomendaciones personalizadas de películas basadas en tus preferencias.<br />
                            <strong>Datos compartidos:</strong> Preferencias de películas y géneros (sin información de identificación personal).<br />
                            <strong>Política de privacidad:</strong> <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://groq.com/privacy-policy/</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Vercel (Hosting y Analytics)</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Alojamiento de la aplicación web y análisis de rendimiento.<br />
                            <strong>Datos compartidos:</strong> Datos de navegación anónimos, métricas de rendimiento.<br />
                            <strong>Política de privacidad:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">hCaptcha (Seguridad)</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Protección contra bots y spam en formularios de registro y login.<br />
                            <strong>Datos compartidos:</strong> Dirección IP, información del navegador.<br />
                            <strong>Política de privacidad:</strong> <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.hcaptcha.com/privacy</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Resend (Servicio de Email)</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Envío de correos electrónicos transaccionales (confirmación de cuenta, recuperación de contraseña, contacto).<br />
                            <strong>Datos compartidos:</strong> Dirección de correo electrónico, nombre.<br />
                            <strong>Política de privacidad:</strong> <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://resend.com/legal/privacy-policy</a>
                        </p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Google OAuth</h4>
                        <p className="text-gray-300 text-sm">
                            <strong>Propósito:</strong> Autenticación opcional mediante cuenta de Google.<br />
                            <strong>Datos compartidos:</strong> ID de Google, nombre, correo electrónico.<br />
                            <strong>Política de privacidad:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://policies.google.com/privacy</a>
                        </p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">4. Uso de la Información</h2>
                <p className="text-gray-300">Utilizamos la información recopilada para los siguientes propósitos:</p>

                <h3 className="text-xl font-semibold text-white mt-4">4.1 Provisión del Servicio</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Crear y gestionar tu cuenta de usuario.</li>
                    <li>Autenticar tu identidad y mantener la seguridad de tu cuenta.</li>
                    <li>Permitirte crear listas, publicar reseñas y participar en watch parties.</li>
                    <li>Sincronizar tus datos entre dispositivos.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">4.2 Personalización</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Generar recomendaciones personalizadas de películas y series mediante IA.</li>
                    <li>Recordar tus preferencias de visualización y configuración.</li>
                    <li>Mostrar contenido relevante basado en tu historial.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">4.3 Comunicación</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Enviar correos de confirmación de cuenta y recuperación de contraseña.</li>
                    <li>Responder a tus consultas y solicitudes de soporte.</li>
                    <li>Enviar newsletters si te has suscrito (con opción de cancelación en cualquier momento).</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">4.4 Mejora del Servicio</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Analizar el uso de la plataforma para identificar áreas de mejora.</li>
                    <li>Detectar y solucionar errores técnicos.</li>
                    <li>Optimizar el rendimiento y la velocidad de carga.</li>
                </ul>

                <h3 className="text-xl font-semibold text-white mt-4">4.5 Seguridad y Cumplimiento Legal</h3>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Prevenir fraude, spam y actividades maliciosas.</li>
                    <li>Cumplir con obligaciones legales y regulatorias.</li>
                    <li>Proteger los derechos y la seguridad de FilmiFy y sus usuarios.</li>
                </ul>

                <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 mt-4">
                    <p className="font-medium text-primary mb-2">🔒 Compromiso de Privacidad</p>
                    <p className="text-gray-300 text-sm">
                        <strong>No vendemos, alquilamos ni compartimos tus datos personales con terceros para fines comerciales o publicitarios.</strong> Solo compartimos información con los proveedores de servicios mencionados anteriormente, y únicamente en la medida necesaria para operar la plataforma.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">5. Cookies y Tecnologías de Seguimiento</h2>
                <p className="text-gray-300">
                    Utilizamos cookies y tecnologías similares para mejorar tu experiencia en FilmiFy:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento básico del sitio (autenticación, sesión).</li>
                    <li><strong>Cookies de preferencias:</strong> Recuerdan tus configuraciones y preferencias.</li>
                    <li><strong>Cookies analíticas:</strong> Nos ayudan a entender cómo se usa la plataforma (Vercel Analytics).</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Puedes configurar tu navegador para rechazar cookies, pero esto puede afectar la funcionalidad de la plataforma.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">6. Seguridad de los Datos</h2>
                <p className="text-gray-300">
                    Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos personales:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li><strong>Cifrado:</strong> Todas las contraseñas se almacenan con hash seguro. Las comunicaciones utilizan HTTPS/TLS.</li>
                    <li><strong>Autenticación segura:</strong> Soporte para autenticación de dos factores mediante proveedores OAuth.</li>
                    <li><strong>Control de acceso:</strong> Row Level Security (RLS) en la base de datos para garantizar que solo accedas a tus propios datos.</li>
                    <li><strong>Monitoreo:</strong> Supervisión continua de actividades sospechosas.</li>
                    <li><strong>Protección contra bots:</strong> hCaptcha para prevenir accesos automatizados maliciosos.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Sin embargo, ningún sistema es 100% seguro. Te recomendamos usar contraseñas fuertes y únicas, y notificarnos inmediatamente si sospechas de un acceso no autorizado a tu cuenta.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">7. Retención de Datos</h2>
                <p className="text-gray-300">
                    Conservamos tus datos personales mientras tu cuenta esté activa o según sea necesario para proporcionarte nuestros servicios. Cuando elimines tu cuenta:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Tus datos personales se eliminarán permanentemente de nuestros sistemas activos.</li>
                    <li>Algunos datos pueden conservarse en copias de seguridad por un período limitado (máximo 90 días).</li>
                    <li>Podemos retener ciertos datos si es requerido por ley o para resolver disputas.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">8. Tus Derechos</h2>
                <p className="text-gray-300">
                    Tienes los siguientes derechos sobre tus datos personales:
                </p>

                <div className="space-y-3 mt-4">
                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Acceso</h4>
                        <p className="text-gray-300 text-sm">Puedes solicitar una copia de todos los datos personales que tenemos sobre ti.</p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Rectificación</h4>
                        <p className="text-gray-300 text-sm">Puedes actualizar o corregir tu información personal desde la configuración de tu perfil.</p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Eliminación</h4>
                        <p className="text-gray-300 text-sm">Puedes solicitar la eliminación permanente de tu cuenta y todos los datos asociados desde "Ajustes" → "Eliminar Cuenta".</p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Portabilidad</h4>
                        <p className="text-gray-300 text-sm">Puedes solicitar una exportación de tus datos en formato legible por máquina.</p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Oposición</h4>
                        <p className="text-gray-300 text-sm">Puedes oponerte al procesamiento de tus datos para ciertos fines, como marketing directo.</p>
                    </div>

                    <div className="bg-white/5 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-1">✓ Derecho de Limitación</h4>
                        <p className="text-gray-300 text-sm">Puedes solicitar la restricción del procesamiento de tus datos en ciertas circunstancias.</p>
                    </div>
                </div>

                <p className="text-gray-300 mt-4">
                    Para ejercer cualquiera de estos derechos, contáctanos a través del formulario de contacto o envía un correo a <a href="mailto:privacy@filmify.com" className="text-primary hover:underline">privacy@filmify.com</a>.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">9. Privacidad de Menores</h2>
                <p className="text-gray-300">
                    FilmiFy no está dirigido a menores de 13 años. No recopilamos intencionalmente información personal de niños menores de 13 años. Si descubrimos que hemos recopilado datos de un menor sin el consentimiento parental verificable, eliminaremos esa información de inmediato.
                </p>
                <p className="text-gray-300">
                    Si eres padre o tutor y crees que tu hijo nos ha proporcionado información personal, contáctanos de inmediato.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">10. Transferencias Internacionales de Datos</h2>
                <p className="text-gray-300">
                    Tus datos pueden ser transferidos y almacenados en servidores ubicados fuera de tu país de residencia, incluyendo Estados Unidos y la Unión Europea. Nos aseguramos de que estas transferencias cumplan con las leyes de protección de datos aplicables y que tus datos estén protegidos mediante medidas de seguridad adecuadas.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">11. Cambios a esta Política</h2>
                <p className="text-gray-300">
                    Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en nuestras prácticas o por razones legales. Te notificaremos sobre cambios significativos mediante:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>Un aviso destacado en la plataforma.</li>
                    <li>Un correo electrónico a tu dirección registrada.</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    La fecha de "Última actualización" al inicio de esta política indica cuándo se realizó la última modificación. Te recomendamos revisar esta política periódicamente.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">12. Contacto</h2>
                <p className="text-gray-300">
                    Si tienes preguntas, inquietudes o solicitudes relacionadas con esta Política de Privacidad o el tratamiento de tus datos personales, puedes contactarnos a través de:
                </p>
                <ul className="list-none space-y-2 ml-4 text-gray-300">
                    <li><strong>Formulario de contacto:</strong> Disponible en <a href="/contact" className="text-primary hover:underline">/contact</a></li>
                    <li><strong>Email:</strong> <a href="mailto:privacy@filmify.com" className="text-primary hover:underline">privacy@filmify.com</a></li>
                </ul>
            </section>

            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg border border-primary/20 mt-8">
                <p className="text-sm text-gray-300">
                    Al utilizar FilmiFy, confirmas que has leído, entendido y aceptado esta Política de Privacidad. Tu privacidad es importante para nosotros, y estamos comprometidos a proteger tus datos personales.
                </p>
            </div>
        </div>
    );
}
