import Link from 'next/link';
import { ArrowLeft, Shield, Database, Globe, Cookie, Mail } from 'lucide-react';

export const metadata = {
  title: 'Política de Privacidad | Contabio',
  description: 'Política de privacidad y tratamiento de datos personales de Contabio conforme a la Ley 1581 de 2012.',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-all group-hover:scale-105">
              <span className="text-white font-black text-xl">C</span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-zinc-900">Contabio</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8 lg:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-zinc-900">Política de Privacidad</h1>
              <p className="text-zinc-500 text-sm">Vigencia desde: Enero de 2026</p>
            </div>
          </div>

          <div className="prose prose-zinc max-w-none">
            {/* Sección 1 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">1</span>
                Responsable del Tratamiento
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                La presente política regula el tratamiento de datos personales realizado por Contabio (en adelante &quot;Contabio&quot;), con domicilio en <span className="font-semibold">Bucaramanga, Colombia</span>.
              </p>
              <div className="bg-emerald-50 rounded-xl p-4 mt-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-emerald-700 text-sm font-semibold">
                  Correo de contacto para privacidad: <a href="mailto:soporte@contabio.pro" className="underline">soporte@contabio.pro</a>
                </p>
              </div>
            </section>

            {/* Sección 2 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">2</span>
                Definición de Roles (Modelo B2B)
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Para efectos de la presente política y dada la naturaleza de nuestra herramienta tecnológica para contadores:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <p className="font-bold text-blue-800 mb-2">El Usuario (Contador/Empresa)</p>
                  <p className="text-blue-700 text-sm">
                    Actúa como <span className="font-bold">RESPONSABLE</span> de la información financiera y personal de sus propios clientes que cargue en la plataforma. El Usuario garantiza que cuenta con la autorización legal para compartir dicha información con proveedores tecnológicos como Contabio.
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                  <p className="font-bold text-emerald-800 mb-2">Contabio</p>
                  <p className="text-emerald-700 text-sm">
                    Actúa como <span className="font-bold">ENCARGADO</span> del tratamiento. Nos limitamos a procesar, almacenar y gestionar la información bajo las instrucciones del Usuario y estrictamente para la prestación del servicio contratado.
                  </p>
                </div>
              </div>
            </section>

            {/* Sección 3 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <Database className="w-6 h-6 text-emerald-600" />
                ¿Qué Datos Recolectamos?
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Contabio recolecta y almacena dos tipos de información:
              </p>
              <div className="space-y-4">
                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                  <p className="font-bold text-zinc-800 mb-2">1. Datos del Usuario (Contador)</p>
                  <p className="text-zinc-600 text-sm">
                    Nombre completo, correo electrónico, número de teléfono, tarjeta profesional (si aplica) y credenciales de acceso.
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                  <p className="font-bold text-zinc-800 mb-2">2. Datos de Terceros (Clientes del Contador)</p>
                  <p className="text-zinc-600 text-sm">
                    NIT, Razón Social, información financiera, balances, XMLs de facturación y nómina, y datos tributarios necesarios para la gestión contable.
                  </p>
                </div>
              </div>
            </section>

            {/* Sección 4 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">4</span>
                Finalidad del Tratamiento
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Los datos recolectados serán utilizados exclusivamente para:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="font-bold text-zinc-800">Prestación del Servicio</p>
                    <p className="text-zinc-600 text-sm">Permitir el funcionamiento de la herramienta, cálculos automatizados, generación de reportes y almacenamiento en la nube.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="font-bold text-zinc-800">Seguridad y Soporte</p>
                    <p className="text-zinc-600 text-sm">Validar la identidad del usuario, recuperar contraseñas y brindar asistencia técnica.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="font-bold text-zinc-800">Mejora Continua</p>
                    <p className="text-zinc-600 text-sm">Analizar métricas de uso anonimizadas para optimizar el rendimiento de la aplicación (vía Google Analytics u otros).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                  <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <div>
                    <p className="font-bold text-zinc-800">Cumplimiento Legal</p>
                    <p className="text-zinc-600 text-sm">Atender requerimientos de autoridades judiciales o administrativas colombianas cuando exista una orden legal vinculante.</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
                <p className="text-red-800 text-sm font-semibold">
                  <span className="font-black">IMPORTANTE:</span> Contabio NO comercializa, vende, ni alquila bases de datos a terceros para fines publicitarios.
                </p>
              </div>
            </section>

            {/* Sección 5 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <Globe className="w-6 h-6 text-emerald-600" />
                Transferencia Internacional y Seguridad
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                El Usuario acepta y autoriza que los datos sean almacenados y procesados en servidores ubicados fuera de Colombia, específicamente en la infraestructura de <span className="font-semibold">Google Cloud Platform (GCP)</span> y <span className="font-semibold">Vercel</span>, ubicados principalmente en Estados Unidos.
              </p>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Estos proveedores cumplen con estándares de seguridad de nivel mundial (ISO 27001, SOC 2). Contabio implementa medidas adicionales como:
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">HTTPS/TLS</p>
                  <p className="text-zinc-400 text-xs mt-1">Encriptación en tránsito</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">AES-256</p>
                  <p className="text-zinc-400 text-xs mt-1">Encriptación en reposo</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Control de Acceso</p>
                  <p className="text-zinc-400 text-xs mt-1">Auditoría de logs</p>
                </div>
              </div>
            </section>

            {/* Sección 6 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">6</span>
                Derechos del Titular (Habeas Data)
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                De acuerdo con la <span className="font-semibold">Ley 1581 de 2012</span>, el Usuario tiene derecho a:
              </p>
              <div className="space-y-3">
                {[
                  'Conocer, actualizar y rectificar sus datos personales.',
                  'Solicitar prueba de la autorización otorgada.',
                  'Ser informado sobre el uso que se le ha dado a sus datos.',
                  'Revocar la autorización y/o solicitar la supresión del dato cuando no se respeten los principios legales.',
                  'Acceder en forma gratuita a sus datos personales.',
                ].map((right, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-zinc-600 text-sm">{right}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-4 mt-6">
                <p className="text-blue-800 text-sm">
                  Para ejercer estos derechos, el Usuario debe enviar una solicitud al correo electrónico <a href="mailto:soporte@contabio.pro" className="font-bold underline">soporte@contabio.pro</a>.
                </p>
              </div>
            </section>

            {/* Sección 7 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <Cookie className="w-6 h-6 text-emerald-600" />
                Uso de Cookies
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Contabio utiliza <span className="font-semibold">cookies técnicas esenciales</span> para mantener la sesión del usuario activa y segura. También puede utilizar cookies de análisis (de terceros) para medir el tráfico del sitio. El Usuario puede configurar su navegador para rechazar las cookies, aunque esto podría afectar el funcionamiento de la plataforma.
              </p>
            </section>

            {/* Sección 8 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">8</span>
                Vigencia y Cambios en la Política
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                La presente Política rige a partir de su publicación. Contabio se reserva el derecho de modificarla en cualquier momento para adaptarla a nuevas realidades legislativas o tecnológicas. Cualquier cambio sustancial será notificado a través de la plataforma o por correo electrónico.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Consulta también nuestros{' '}
            <Link href="/terminos" className="text-emerald-600 font-semibold hover:underline">
              Términos y Condiciones
            </Link>{' '}
            y{' '}
            <Link href="/seguridad" className="text-emerald-600 font-semibold hover:underline">
              Declaración de Seguridad
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Contabio by Valueum
          </p>
        </div>
      </footer>
    </div>
  );
}
