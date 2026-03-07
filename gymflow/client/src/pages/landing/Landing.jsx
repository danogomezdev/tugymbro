import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Users, Calendar, BarChart2, Shield, ChevronRight, Check, Building2, Zap, Star } from 'lucide-react';

const FEATURES_BASICO = ['Reservas de turnos online','Gestión de pagos y comprobantes','Notificaciones automáticas','Panel admin completo','App para clientes','Hasta 100 clientes'];
const FEATURES_PREMIUM = ['Todo lo del plan Básico','Rutinas personalizadas','Múltiples profesores','Historial y progreso del cliente','Plantillas de rutinas','Estadísticas avanzadas','Logo y colores propios','Clientes ilimitados'];

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&family=Bebas+Neue&display=swap');
        .bebas{font-family:'Bebas Neue',sans-serif;letter-spacing:.02em}
        .grad-text{background:linear-gradient(135deg,#fff,#a3a3a3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .blue-text{background:linear-gradient(135deg,#3b82f6,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .card-hover{transition:all .3s cubic-bezier(.4,0,.2,1)}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,.6)}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .float{animation:float 4s ease-in-out infinite}
        .fade-up{animation:fadeUp .7s ease forwards}
        .fade-up-2{animation:fadeUp .7s .15s ease forwards;opacity:0}
        .fade-up-3{animation:fadeUp .7s .3s ease forwards;opacity:0}
      `}</style>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY>50?'bg-black/95 backdrop-blur-lg border-b border-neutral-900':''}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center"><Dumbbell size={16} className="text-white"/></div>
            <span className="bebas text-xl text-white tracking-wider">TGB</span>
            <span className="text-neutral-700 text-xs hidden sm:block">· Tu Gym Bro</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={()=>navigate('/superadmin/login')} className="text-neutral-600 hover:text-white text-sm transition-colors hidden sm:block">Admin</button>
            <button onClick={()=>navigate('/registro-gym')} className="bg-white hover:bg-neutral-200 text-black text-sm font-bold px-4 py-2 rounded-lg transition-all">Quiero TGB →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"/>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/3 rounded-full blur-3xl"/>
        </div>
        <div className="absolute top-32 right-12 text-neutral-900 bebas text-9xl select-none hidden lg:block float">500</div>
        <div className="absolute bottom-32 left-8 text-neutral-900 bebas text-7xl select-none hidden lg:block float" style={{animationDelay:'1s'}}>GYM</div>
        <div className="relative max-w-5xl mx-auto px-6 text-center pt-24">
          <div className="inline-flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-full px-4 py-2 mb-8 fade-up">
            <Zap size={14} className="text-blue-500"/>
            <span className="text-neutral-400 text-sm font-medium">Plataforma de gestión para gimnasios</span>
          </div>
          <h1 className="bebas text-7xl sm:text-8xl md:text-[10rem] leading-none mb-6 fade-up-2">
            <span className="grad-text">TU GYM</span><br/><span className="text-white">EN UN APP</span>
          </h1>
          <p className="text-neutral-500 text-lg sm:text-xl max-w-2xl mx-auto mb-10 fade-up-3 leading-relaxed">
            Reservas, rutinas, pagos y más — todo bajo la marca de tu gimnasio. Listo en minutos, pensado para crecer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-up-3">
            <button onClick={()=>navigate('/registro-gym')} className="bg-white hover:bg-neutral-200 text-black font-bold px-8 py-4 rounded-xl text-lg transition-all flex items-center justify-center gap-2">
              Empezar gratis <ChevronRight size={20}/>
            </button>
            <button onClick={()=>document.getElementById('planes').scrollIntoView({behavior:'smooth'})} className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-white font-medium px-8 py-4 rounded-xl text-lg transition-all">
              Ver planes
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-16 fade-up-3">
            {[{n:'2 min',label:'Setup inicial'},{n:'100%',label:'Tu marca'},{n:'24/7',label:'Disponible'}].map((s,i)=>(
              <div key={i} className="bg-neutral-950 border border-neutral-900 rounded-xl p-4">
                <p className="bebas text-3xl text-white">{s.n}</p>
                <p className="text-neutral-600 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-neutral-600 text-sm font-bold tracking-widest uppercase mb-3">Funcionalidades</p>
            <h2 className="bebas text-5xl sm:text-6xl text-white">TODO LO QUE NECESITÁS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {icon:Calendar,title:'Reservas online',desc:'Tus clientes reservan su turno desde el celular, ven disponibilidad en tiempo real y reciben confirmación automática.',color:'text-blue-400',bg:'bg-blue-950/50'},
              {icon:Dumbbell,title:'Rutinas personalizadas',desc:'Creá rutinas por día para cada cliente. Ellos la siguen desde la app, registran pesos y ven su progreso.',color:'text-neutral-300',bg:'bg-neutral-900'},
              {icon:BarChart2,title:'Pagos y comprobantes',desc:'Los clientes suben su comprobante, vos lo aprobás. Control total de quién pagó y quién no.',color:'text-neutral-300',bg:'bg-neutral-900'},
              {icon:Users,title:'Múltiples profesores',desc:'Asigná alumnos a cada profe. Cada profesor ve y gestiona solo sus alumnos asignados.',color:'text-neutral-300',bg:'bg-neutral-900'},
              {icon:Shield,title:'Tu marca, tu app',desc:'Colores, logo y nombre de tu gimnasio. Los clientes ven tu marca, no la nuestra.',color:'text-neutral-300',bg:'bg-neutral-900'},
              {icon:Zap,title:'Listo en minutos',desc:'Registrás tu gimnasio, te aprobamos, y ya tenés tu app andando. Sin instalaciones ni servidores.',color:'text-blue-400',bg:'bg-blue-950/50'},
            ].map((f,i)=>(
              <div key={i} className="card-hover bg-neutral-950 border border-neutral-900 rounded-2xl p-6 hover:border-neutral-700">
                <div className={`inline-flex p-3 rounded-xl ${f.bg} mb-4`}><f.icon className={f.color} size={22}/></div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="py-24 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-neutral-600 text-sm font-bold tracking-widest uppercase mb-3">Precios</p>
            <h2 className="bebas text-5xl sm:text-6xl text-white">ELEGÍ TU PLAN</h2>
            <p className="text-neutral-600 mt-3">Empezá con lo que necesitás, escalá cuando quieras</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-hover bg-neutral-950 border border-neutral-800 rounded-2xl p-8">
              <p className="text-neutral-500 text-sm font-medium uppercase tracking-wider mb-2">Básico</p>
              <p className="bebas text-4xl text-white mb-6">Consultar precio</p>
              <div className="space-y-3 mb-8">
                {FEATURES_BASICO.map((f,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0"><Check size={11} className="text-neutral-300"/></div>
                    <span className="text-neutral-400 text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/registro-gym')} className="w-full py-3 rounded-xl border border-neutral-700 text-white font-bold hover:bg-neutral-900 transition-all">Empezar →</button>
            </div>
            <div className="card-hover relative bg-neutral-950 border border-neutral-700 rounded-2xl p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1"><Star size={11} fill="black"/> RECOMENDADO</span>
              </div>
              <p className="text-neutral-300 text-sm font-medium uppercase tracking-wider mb-2">Premium</p>
              <p className="bebas text-4xl blue-text mb-6">Consultar precio</p>
              <div className="space-y-3 mb-8">
                {FEATURES_PREMIUM.map((f,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-blue-950/50 rounded-full flex items-center justify-center flex-shrink-0"><Check size={11} className="text-blue-400"/></div>
                    <span className="text-neutral-300 text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/registro-gym')} className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold transition-all">Empezar con Premium →</button>
            </div>
          </div>
          <p className="text-center text-neutral-700 text-sm mt-6">¿Preguntas? <a href="mailto:hola@tugymbro.com" className="text-neutral-400 hover:text-white transition-colors">Escribinos</a></p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-24 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-neutral-600 text-sm font-bold tracking-widest uppercase mb-3">Proceso</p>
            <h2 className="bebas text-5xl sm:text-6xl text-white">TAN FÁCIL COMO</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {n:'01',title:'Registrá tu gym',desc:'Completá el formulario con los datos de tu gimnasio y elegí tu plan.'},
              {n:'02',title:'Aprobación en 24hs',desc:'Revisamos tu solicitud y activamos tu gimnasio con todos los accesos.'},
              {n:'03',title:'A entrenar',desc:'Compartí el link a tus clientes y gestioná todo desde el panel admin.'},
            ].map((s,i)=>(
              <div key={i} className="relative">
                <div className="bebas text-8xl text-neutral-900 absolute -top-4 -left-2 select-none">{s.n}</div>
                <div className="relative bg-neutral-950 border border-neutral-900 rounded-2xl p-6 pt-10">
                  <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-12">
            <Building2 className="text-neutral-400 mx-auto mb-6" size={48}/>
            <h2 className="bebas text-5xl sm:text-6xl text-white mb-4">TU GYM EN LA APP</h2>
            <p className="text-neutral-500 text-lg mb-8">Sumate a los gimnasios que ya gestionan todo con TGB.</p>
            <button onClick={()=>navigate('/registro-gym')} className="bg-white hover:bg-neutral-200 text-black font-bold px-10 py-4 rounded-xl text-lg transition-all inline-flex items-center gap-2">
              Registrar mi gimnasio <ChevronRight size={20}/>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-900 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center"><Dumbbell size={12} className="text-white"/></div>
            <span className="bebas text-white tracking-wider">TGB</span>
            <span className="text-neutral-800 text-xs">· Tu Gym Bro</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-700 text-xs">
            <button onClick={()=>navigate('/superadmin/login')} className="hover:text-neutral-400 transition-colors">Admin</button>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
