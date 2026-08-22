import Link from "next/link";
import {CTA, Layout} from "./components";

export type LocationData = {
  city:string; eyebrow:string; intro:string; areas:string[];
  routes:{from:string;detail:string}[]; weather:{title:string;detail:string}[];
  employers:string; neighborhoods:{name:string;detail:string}[];
  times:{area:string;window:string;note:string}[];
};

export function LocationPage({data}:{data:LocationData}){
  return <Layout>
    <section className="localHero"><div><span className="eyebrow">{data.eyebrow}</span><h1>Renta de equipo para acampar en {data.city}</h1><p>{data.intro}</p><div className="localActions"><Link className="primary" href="/reservar">Elegir mis fechas</Link><Link className="textLink" href="/contacto">Consultar mi domicilio →</Link></div></div><aside><b>Cómo funciona</b><ol><li>Selecciona las noches de tu campamento.</li><li>Coordinamos la entrega en tu domicilio 1 o 2 días antes.</li><li>Recogemos todo en ese mismo domicilio.</li></ol><small>No entregamos directamente en el lugar de camping.</small></aside></section>
    <section className="localSection"><div className="sectionTitle"><span className="eyebrow">Cobertura local</span><h2>Zonas que atendemos</h2><p>La cobertura depende del código postal, la fecha y la ruta disponible.</p></div><div className="areaPills">{data.areas.map(a=><span key={a}>{a}</span>)}</div></section>
    <section className="localSplit"><div><span className="eyebrow">Referencias de acceso</span><h2>Cómo ubicamos tu entrega</h2><p>Estas referencias ayudan a estimar la ruta; la dirección final se confirma por WhatsApp después del pago.</p>{data.routes.map(r=><article className="routeRow" key={r.from}><b>Desde {r.from}</b><p>{r.detail}</p></article>)}</div><div className="weatherPanel"><span className="eyebrow">Clima local</span><h2>Lo que conviene prever</h2>{data.weather.map(w=><article key={w.title}><b>{w.title}</b><p>{w.detail}</p></article>)}</div></section>
    <section className="localSection"><div className="sectionTitle"><span className="eyebrow">Por zona</span><h2>Contenido útil para tu colonia</h2></div><div className="neighborhoodGrid">{data.neighborhoods.map(n=><article key={n.name}><h3>{n.name}</h3><p>{n.detail}</p><Link href="/contacto">Confirmar cobertura →</Link></article>)}</div></section>
    <section className="employerBand"><div><span className="eyebrow">Centros de trabajo y vivienda</span><h2>Entregas cerca de corredores empresariales</h2></div><p>{data.employers}</p></section>
    <section className="localSection"><div className="sectionTitle"><span className="eyebrow">Tiempos estimados</span><h2>Cuándo coordinamos tu equipo</h2><p>Son ventanas de coordinación, no tiempos de entrega inmediata. Reserva con anticipación para asegurar inventario.</p></div><div className="timeTable">{data.times.map(t=><div key={t.area}><b>{t.area}</b><strong>{t.window}</strong><span>{t.note}</span></div>)}</div></section>
    <section className="compareSection"><div><span className="eyebrow">Compara antes de decidir</span><h2>Una opción práctica para acampar sin comprar todo</h2></div><div className="compareTable"><div className="compareHead"><b>Opción</b><b>Entrega y recolección</b><b>Equipo integrado</b><b>Soporte</b></div><div className="featured"><b>Camp Rocka</b><span>En el mismo domicilio</span><span>Paquete para hasta 4</span><span>Coordinación por WhatsApp</span></div><div><b>Renta informal</b><span>Varía por proveedor</span><span>Puede estar incompleto</span><span>Depende del particular</span></div><div><b>Comprar equipo</b><span>No aplica</span><span>Tú lo seleccionas</span><span>Garantía de cada tienda</span></div></div><p className="comparisonNote">Comparación general de modelos de servicio; condiciones y precios de terceros pueden cambiar.</p></section>
    <CTA/>
  </Layout>
}
