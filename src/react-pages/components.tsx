import Link from "next/link";

export const nav = [
  ["Inicio", "/"], ["Equipo", "/servicios"], ["Zonas de entrega", "/ubicaciones"],
  ["Blog", "/blog"], ["Nosotros", "/nosotros"], ["Contacto", "/contacto"],
];

export function Header() {
  return <header className="header"><Link className="brand" href="/" aria-label="Camp Rocka, inicio"><img src="/camp-rocka-logo.webp" alt="Camp Rocka"/></Link><nav>{nav.map(([n,h])=><Link key={h} href={h}>{n}</Link>)}</nav><Link className="navCta" href="/reservar">Elegir fecha</Link></header>
}

export function Footer() {
  return <footer><div><Link className="brand footerBrand" href="/" aria-label="Camp Rocka, inicio"><img src="/camp-rocka-logo.webp" alt="Camp Rocka"/></Link><p>Equipo limpio, completo y listo para tu próxima aventura.</p></div><div><b>Explora</b><Link href="/servicios">Equipo y paquetes</Link><Link href="/ubicaciones">Zonas de entrega</Link><Link href="/blog">Guías de camping</Link><Link href="/cdmx">CDMX</Link><Link href="/edomex">Estado de México</Link><Link href="/pachuca">Pachuca</Link></div><div><b>Ayuda</b><Link href="/contacto">Cotizar</Link><Link href="/nosotros">Cómo funciona</Link></div><p className="copyright">© 2026 Camp Rocka</p></footer>
}

export function Layout({children}:{children:React.ReactNode}) { return <><Header/><main>{children}</main><Footer/></> }

export function SearchBox(){return <form className="searchBox" action="/reservar"><label>¿A dónde entregamos?<select name="zona" defaultValue=""><option value="" disabled>Selecciona una zona</option><option>CDMX</option><option>Estado de México</option><option>Pachuca</option></select></label><label>¿Qué día empieza tu campamento?<input required name="fecha" type="date" /></label><label>¿Qué día termina?<input required name="salida" type="date" /></label><button aria-label="Elegir fechas">⌕</button></form>}

export function ContactForm({compact=false}:{compact?:boolean}){return <form className={`contactForm ${compact?'compact':''}`}><div className="formGrid"><label>Nombre<input required placeholder="Tu nombre"/></label><label>WhatsApp<input required type="tel" placeholder="55 0000 0000"/></label><label>Zona de entrega<select defaultValue=""><option value="" disabled>Selecciona una zona</option><option>CDMX</option><option>Estado de México</option><option>Pachuca</option></select></label><label>Fecha del campamento<input type="date"/></label></div><label>¿Qué necesitas?<textarea rows={4} placeholder="Cuántas personas, cuántos días y qué equipo necesitas"/></label><button type="submit" className="primary">Solicitar cotización</button><small>Te contactaremos para confirmar disponibilidad, costo y horario de entrega.</small></form>}

export const gear = [
  {icon:"⛺",title:"Casas de campaña",text:"Opciones para 2, 4 y 6 personas, revisadas antes de cada entrega."},
  {icon:"☾",title:"Sleeping bags",text:"Sacos cómodos para completar tu descanso sin comprar equipo nuevo."},
  {icon:"▰",title:"Colchones inflables",text:"Más comodidad para parejas, familias y primeras experiencias de camping."},
  {icon:"♨",title:"Cocina y mobiliario",text:"Mesas, sillas, estufas, lámparas, hieleras y accesorios para tu campamento."},
];

export function CTA(){return <section className="cta"><div><span className="eyebrow">Tu aventura empieza aquí</span><h2>Primera noche $1,999.<br/>Adicionales por $799.</h2></div><Link className="whiteButton" href="/reservar">Elegir mis fechas →</Link></section>}
