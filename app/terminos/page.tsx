import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Términos y Condiciones | Contabio',
  description: 'Términos y condiciones de uso de la plataforma Contabio para contadores colombianos.',
};

export default function TerminosPage() {
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
          <h1 className="text-4xl font-black text-zinc-900 mb-2">Términos y Condiciones</h1>
          <p className="text-zinc-500 text-sm mb-8">Fecha de última actualización: Enero de 2026</p>

          <div className="prose prose-zinc max-w-none">
            {/* Sección 1 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">1</span>
                Introducción y Aceptación
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Bienvenido a Contabio (en adelante, &quot;La Plataforma&quot;), con domicilio principal en Bucaramanga, Colombia.
              </p>
              <p className="text-zinc-600 leading-relaxed mt-4">
                Al acceder, navegar o utilizar la plataforma disponible en <span className="font-semibold text-emerald-600">contabio.pro</span> y sus subdominios, usted (en adelante, &quot;El Usuario&quot; o &quot;El Contador&quot;) acepta estar vinculado legalmente por los presentes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, debe abstenerse de utilizar el servicio.
              </p>
            </section>

            {/* Sección 2 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">2</span>
                Descripción del Servicio
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Contabio es una herramienta tecnológica de asistencia contable y tributaria (&quot;Software as a Service&quot; - SaaS) diseñada para optimizar procesos, facilitar cálculos y gestionar información relacionada con el sistema tributario colombiano y la Dirección de Impuestos y Aduanas Nacionales (DIAN).
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                <p className="text-amber-800 text-sm font-semibold">
                  <span className="font-black">IMPORTANTE:</span> Contabio es una herramienta de apoyo técnico. La interpretación de las normas, la validación final de las cifras y la presentación de obligaciones ante la DIAN son responsabilidad exclusiva del Contador Público o Usuario, quien actúa bajo su criterio profesional y ética.
                </p>
              </div>
            </section>

            {/* Sección 3 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">3</span>
                Modelo de Uso y Cuentas
              </h2>

              <h3 className="text-lg font-bold text-zinc-800 mt-6 mb-3">3.1. Registro y Seguridad</h3>
              <p className="text-zinc-600 leading-relaxed">
                Para acceder a la herramienta, El Usuario debe crear una cuenta proporcionando información veraz y actual. La custodia de las credenciales de acceso (usuario y contraseña) es responsabilidad exclusiva del Usuario.
              </p>
              <ul className="list-disc list-inside text-zinc-600 mt-4 space-y-2">
                <li>La Empresa no se hace responsable por accesos no autorizados derivados de negligencia en el cuidado de las credenciales por parte del Usuario (ej: phishing, contraseñas compartidas).</li>
              </ul>

              <h3 className="text-lg font-bold text-zinc-800 mt-6 mb-3">3.2. Modalidad Freemium y Pagos</h3>
              <p className="text-zinc-600 leading-relaxed">
                Actualmente, Contabio opera bajo un modelo promocional de acceso gratuito (&quot;Freemium&quot;) o de prueba para nuevos usuarios.
              </p>
              <ul className="list-disc list-inside text-zinc-600 mt-4 space-y-2">
                <li><span className="font-semibold">Transición a Pago:</span> La Empresa se reserva el derecho de modificar, finalizar o limitar el acceso gratuito en cualquier momento, notificando al Usuario con al menos treinta (30) días de antelación sobre los nuevos planes de suscripción y tarifas aplicables.</li>
                <li>El uso continuado de la plataforma tras dicho aviso constituirá la aceptación de las nuevas condiciones comerciales.</li>
              </ul>
            </section>

            {/* Sección 4 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">4</span>
                Limitación de Responsabilidad
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                Dado que el software está sujeto a actualizaciones normativas constantes y posibles fallos técnicos inherentes a la tecnología:
              </p>
              <div className="space-y-4">
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="font-bold text-zinc-800 mb-2">1. No Asesoría Legal/Tributaria</p>
                  <p className="text-zinc-600 text-sm">La información generada por Contabio no constituye asesoría legal ni tributaria vinculante. El Usuario debe validar cualquier resultado antes de presentarlo ante terceros o autoridades.</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="font-bold text-zinc-800 mb-2">2. Multas y Sanciones</p>
                  <p className="text-zinc-600 text-sm">La Empresa NO será responsable por multas, sanciones, intereses de mora o requerimientos impuestos por la DIAN o cualquier otra entidad, derivados de errores en la carga de datos, interpretaciones normativas o fallos en la disponibilidad del servicio.</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="font-bold text-zinc-800 mb-2">3. Disponibilidad (SLA)</p>
                  <p className="text-zinc-600 text-sm">Aunque utilizamos infraestructura de clase mundial (Google Cloud / Vercel) para garantizar un uptime elevado, no garantizamos que el servicio sea ininterrumpido o libre de errores. No responderemos por lucro cesante o daño emergente causado por interrupciones del servicio.</p>
                </div>
              </div>
            </section>

            {/* Sección 5 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">5</span>
                Propiedad Intelectual
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Todo el software, código fuente, algoritmos, diseños, marcas (incluyendo &quot;Contabio&quot;) y contenidos de la plataforma son propiedad exclusiva de La Empresa y están protegidos por las leyes de propiedad intelectual de Colombia y tratados internacionales.
              </p>
              <ul className="list-disc list-inside text-zinc-600 mt-4 space-y-2">
                <li>Se prohíbe terminantemente la ingeniería inversa, copia, distribución o creación de trabajos derivados basados en Contabio sin autorización escrita.</li>
              </ul>
            </section>

            {/* Sección 6 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">6</span>
                Protección de Datos y Habeas Data
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios:
              </p>
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="font-bold text-emerald-800 mb-2">Rol de las Partes</p>
                  <p className="text-emerald-700 text-sm">El Usuario actúa como Responsable del Tratamiento de los datos de sus clientes (terceros) que cargue en la plataforma. La Empresa actúa como Encargado del Tratamiento, limitándose a procesar dicha información para la prestación del servicio.</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="font-bold text-emerald-800 mb-2">Seguridad</p>
                  <p className="text-emerald-700 text-sm">La Empresa implementa medidas de seguridad técnicas (cifrado, firewalls) para proteger la información.</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="font-bold text-emerald-800 mb-2">Autorización</p>
                  <p className="text-emerald-700 text-sm">El Usuario declara contar con la autorización de sus clientes para cargar su información financiera en herramientas de terceros como Contabio.</p>
                </div>
              </div>
              <p className="text-zinc-600 mt-4">
                Para más detalles, consulte nuestra <Link href="/privacidad" className="text-emerald-600 font-semibold hover:underline">Política de Privacidad</Link>.
              </p>
            </section>

            {/* Sección 7 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">7</span>
                Obligaciones del Usuario
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">El Usuario se compromete a:</p>
              <ul className="list-disc list-inside text-zinc-600 space-y-2">
                <li>No utilizar la plataforma para fines ilícitos, lavado de activos o financiación del terrorismo.</li>
                <li>No intentar vulnerar la seguridad de la plataforma ni inyectar virus o código malicioso.</li>
                <li>Respetar los derechos de propiedad intelectual de La Empresa.</li>
              </ul>
            </section>

            {/* Sección 8 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">8</span>
                Modificaciones a los Términos
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                La Empresa podrá modificar estos Términos y Condiciones en cualquier momento. Las modificaciones serán efectivas una vez publicadas en el sitio web. Se recomienda al Usuario revisar esta sección periódicamente.
              </p>
            </section>

            {/* Sección 9 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-black">9</span>
                Ley Aplicable y Jurisdicción
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia que surja de la interpretación o ejecución de estos términos será sometida a los jueces de la República de Colombia, con sede en la ciudad de Bucaramanga.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Consulta también nuestra{' '}
            <Link href="/privacidad" className="text-emerald-600 font-semibold hover:underline">
              Política de Privacidad
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
