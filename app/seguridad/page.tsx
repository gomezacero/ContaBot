import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Server, Cloud, CheckCircle, FileCheck } from 'lucide-react';

export const metadata = {
  title: 'Declaración de Seguridad | Contabio',
  description: 'Declaración de seguridad, calidad y cumplimiento normativo de Contabio. Seguridad de grado bancario para tu contabilidad.',
};

export default function SeguridadPage() {
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

      {/* Hero Section */}
      <section className="bg-zinc-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-900/50">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-black mb-4">Declaración de Seguridad</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Calidad y Cumplimiento Normativo
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Compromiso */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 lg:p-12 text-white mb-12 shadow-xl">
          <h2 className="text-2xl lg:text-3xl font-black mb-4">Nuestro Compromiso de Confianza</h2>
          <p className="text-emerald-100 leading-relaxed text-lg">
            En Contabio, entendemos que la información contable es el activo más sensible de cualquier organización. No solo gestionamos datos; <span className="font-bold text-white">custodiamos la confianza de sus clientes</span>. Por ello, hemos diseñado nuestra infraestructura bajo una premisa innegociable:
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-6 py-3 rounded-full">
            <Shield className="w-5 h-5" />
            <span className="font-black text-lg">Seguridad de Grado Bancario</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8 lg:p-12">
          <div className="prose prose-zinc max-w-none">
            {/* Sección 2 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                <Server className="w-7 h-7 text-emerald-600" />
                Blindaje Tecnológico (Infraestructura)
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-6">
                Nuestra plataforma no reside en un servidor convencional. Operamos bajo una <span className="font-semibold">arquitectura de nube distribuida de clase mundial</span>, utilizando los mismos proveedores que las grandes entidades financieras globales.
              </p>

              {/* Cifrado */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-zinc-800 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Cifrado de Datos (Encriptación)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">→</span>
                      </div>
                      <p className="text-white font-bold">En Tránsito</p>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Toda conexión entre su computadora y Contabio está protegida por protocolos <span className="text-emerald-400 font-bold">TLS 1.2/1.3</span> de última generación. Es matemáticamente imposible interceptar la información mientras viaja por internet.
                    </p>
                  </div>
                  <div className="bg-zinc-900 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">💾</span>
                      </div>
                      <p className="text-white font-bold">En Reposo</p>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Sus bases de datos están cifradas utilizando el estándar <span className="text-emerald-400 font-bold">AES-256</span>. Incluso en el hipotético caso de una intrusión física, los datos serían ilegibles sin las llaves criptográficas que rotamos periódicamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Alianzas */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-zinc-800 mb-4 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-emerald-600" />
                  Alianzas Tecnológicas Estratégicas
                </h3>
                <p className="text-zinc-600 mb-4">
                  Para garantizar la máxima disponibilidad y seguridad, Contabio se construye sobre dos gigantes tecnológicos:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <p className="font-black text-blue-800 text-lg mb-2">Google Cloud Platform</p>
                    <p className="text-blue-700 text-sm">
                      Proveedor de nuestra infraestructura de base de datos y procesamiento, cumpliendo con certificaciones globales <span className="font-semibold">(ISO 27001, SOC 2)</span>.
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-2xl p-6">
                    <p className="font-black text-white text-lg mb-2">Vercel Edge Network</p>
                    <p className="text-zinc-300 text-sm">
                      Proveedor de nuestra capa de presentación, con <span className="font-semibold text-emerald-400">Firewall de Aplicación Web (WAF)</span> global que bloquea ataques antes de que toquen nuestros sistemas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backups */}
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                <h3 className="text-xl font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Copias de Seguridad (Backup)
                </h3>
                <p className="text-emerald-700 text-sm leading-relaxed">
                  Realizamos copias de seguridad automáticas y redundantes. Sus datos se replican en diferentes ubicaciones geográficas para garantizar que, ante cualquier catástrofe digital, su contabilidad permanezca intacta.
                </p>
              </div>
            </section>

            {/* Sección 3 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                <FileCheck className="w-7 h-7 text-emerald-600" />
                Marco Legal y Normativo (Colombia)
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-6">
                Contabio opera con estricto apego a la legislación colombiana, protegiendo tanto al Contador como a la Empresa final.
              </p>

              {/* Habeas Data */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Ley de Habeas Data (Ley 1581 de 2012)</h3>
                <p className="text-zinc-600 mb-4">
                  Actuamos bajo la figura de &quot;Encargado del Tratamiento&quot;. Esto significa que:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-bold text-zinc-800">Propiedad</p>
                      <p className="text-zinc-600 text-sm">Los datos son suyos y de sus clientes. Contabio <span className="font-bold text-red-600">no vende, no alquila y no comercializa</span> su información financiera con terceros.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-bold text-zinc-800">Transparencia</p>
                      <p className="text-zinc-600 text-sm">Usted tiene derecho a saber qué datos tenemos y solicitar su eliminación en cualquier momento (sujeto a las obligaciones fiscales de retención).</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secreto Profesional */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-zinc-800 mb-4">Secreto Profesional y Confidencialidad</h3>
                <p className="text-zinc-600 mb-4">
                  Nuestros Términos y Condiciones extienden el deber de Secreto Profesional del contador a nuestra tecnología.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <ul className="space-y-2 text-amber-800 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Nuestro equipo humano <span className="font-bold">NO tiene acceso</span> a leer sus facturas o balances.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>El acceso administrativo está restringido exclusivamente a tareas de mantenimiento técnico automatizado y soporte bajo su expresa autorización.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* DIAN */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-3">Alineación con Normativa DIAN</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Nuestra arquitectura está diseñada para cumplir con los estándares técnicos exigidos por la DIAN en materia de facturación y nómina electrónica, garantizando la integridad de los documentos XML y la trazabilidad de las operaciones.
                </p>
              </div>
            </section>

            {/* Sección 4 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                <Shield className="w-7 h-7 text-emerald-600" />
                Seguridad Operativa y Calidad
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-6">
                La seguridad no es solo software; es cultura.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 text-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-zinc-800 mb-2">Autenticación Robusta</p>
                  <p className="text-zinc-600 text-sm">Recomendamos y facilitamos el uso de contraseñas seguras y verificación de identidad.</p>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 text-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-zinc-800 mb-2">Auditoría de Eventos</p>
                  <p className="text-zinc-600 text-sm">El sistema registra internamente las operaciones críticas para trazabilidad forense.</p>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 text-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Server className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-zinc-800 mb-2">Monitoreo 24/7</p>
                  <p className="text-zinc-600 text-sm">Sistemas automatizados que vigilan la plataforma las 24 horas del día.</p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="bg-zinc-900 rounded-2xl p-8 text-center">
              <p className="text-emerald-400 font-bold mb-2">¿Tiene dudas sobre nuestra seguridad?</p>
              <p className="text-white text-lg mb-6">
                La transparencia es parte de nuestra seguridad. Si usted es un auditor, oficial de cumplimiento o director de TI y requiere detalles técnicos específicos, puede contactar a nuestro equipo.
              </p>
              <a
                href="mailto:soporte@contabio.pro"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all"
              >
                Contactar Oficial de Protección de Datos
              </a>
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
            <Link href="/privacidad" className="text-emerald-600 font-semibold hover:underline">
              Política de Privacidad
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-100 py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-emerald-600 font-black text-lg mb-2">
            Contabio: Tecnología que protege su contabilidad.
          </p>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Contabio by Valueum
          </p>
        </div>
      </footer>
    </div>
  );
}
