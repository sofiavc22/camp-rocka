import Link from "next/link";import {Layout,CTA} from "../components";
export const metadata={title:"Guías para rentar equipo de camping | Camp Rocka",description:"Precios, paquetes y consejos para rentar equipo de camping en CDMX, Estado de México y Pachuca.",alternates:{canonical:"/blog"}};
const posts=[
  {href:"/blog/renta-equipo-camping-cdmx",tag:"CDMX",title:"¿Dónde rentar equipo de camping en CDMX con entrega a domicilio?",text:"Qué incluye, cuánto cuesta y cómo recibirlo antes de tu campamento."},
  {href:"/blog/precios-renta-equipo-acampar",tag:"Precios",title:"Precios de renta de equipo para acampar: guía completa",text:"Compara la primera noche, noches adicionales y depósito de garantía."},
  {href:"/blog/renta-casa-campana-4-personas",tag:"Equipo",title:"Renta de casa de campaña para 4 personas: qué revisar",text:"Una guía para elegir un paquete completo y evitar compras innecesarias."},
  {href:"/blog/renta-camping-fin-de-semana",tag:"Fin de semana",title:"Renta de equipo de camping por fin de semana",text:"Calcula tus noches y prepara la entrega sin ir a recoger el equipo."},
  {href:"/blog/renta-equipo-camping-pachuca",tag:"Pachuca",title:"Dónde rentar equipo de camping en Pachuca",text:"Recibe el paquete en casa antes de salir hacia Huasca, Mineral del Chico o Real del Monte."}
];
export default function Blog(){return <Layout><section className="pageHero"><span className="eyebrow">Blog Camp Rocka</span><h1>Guías para rentar<br/>sin comprar de más.</h1><p>Respuestas claras sobre precios, paquetes, entrega y zonas de cobertura para preparar tu próximo campamento.</p></section><section className="blogGrid">{posts.map(p=><article key={p.href}><span>{p.tag}</span><h2>{p.title}</h2><p>{p.text}</p><Link href={p.href}>Leer guía →</Link></article>)}</section><CTA/></Layout>}
