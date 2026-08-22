"use client";
import {useEffect,useState} from "react";

export default function Booking(){
  const [date,setDate]=useState(""); const [endDate,setEndDate]=useState("");
  useEffect(()=>{const params=new URLSearchParams(window.location.search); const selected=params.get("fecha"); const end=params.get("salida"); if(selected)setDate(selected); if(end)setEndDate(end)},[]);
  const min=new Date(Date.now()+2*86400000).toISOString().split("T")[0];
  const minEnd=date?new Date(new Date(`${date}T12:00:00`).getTime()+86400000).toISOString().split("T")[0]:min;
  const nights=date&&endDate?Math.max(0,Math.round((new Date(`${endDate}T12:00:00`).getTime()-new Date(`${date}T12:00:00`).getTime())/86400000)):0;
  const additionalNights=Math.max(0,nights-1);
  const total=nights>0?1999+(additionalNights*799):0;
  const money=(value:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);
  return <form className="bookingCard" onSubmit={e=>e.preventDefault()}>
    <div className="bookingTop"><span>Paso 1 de 2</span><b>Selecciona las noches</b></div>
    <div className="dateRange"><label className="datePicker"><span>¿Qué día empieza tu campamento?</span><input required min={min} value={date} onChange={e=>{setDate(e.target.value);if(endDate&&endDate<=e.target.value)setEndDate("")}} type="date"/></label><label className="datePicker"><span>¿Qué día termina?</span><input required min={minEnd} value={endDate} onChange={e=>setEndDate(e.target.value)} type="date"/></label></div>
    <small className="deliveryNote">Nosotros coordinaremos contigo la entrega del equipo en tu domicilio uno o dos días antes, para que tengas todo listo.</small>
    {nights>0&&<><div className="staySummary"><span>Duración seleccionada</span><b>{nights} {nights===1?"noche":"noches"}</b></div><div className="priceSummary"><div><span>Primera noche</span><b>{money(1999)}</b></div>{additionalNights>0&&<div><span>{additionalNights} {additionalNights===1?"noche adicional":"noches adicionales"} · $799 c/u</span><b>{money(additionalNights*799)}</b></div>}<div className="payToday"><span>A pagar hoy <small>IVA incluido</small></span><strong>{money(total)} MXN</strong></div></div><p className="depositNote"><b>Depósito de garantía</b> El día de la entrega se requerirá un depósito de $999 MXN. Se devuelve al recoger el equipo completo y en las condiciones acordadas.</p></>}
    <button className="primary bookingButton" disabled={!date||!endDate}>{date&&endDate?`Continuar al pago · ${money(total)}`:"Elige las fechas para continuar"}</button>
    <p className="secureNote">El pago se realizará de forma segura a través de Stripe.</p>
  </form>
}
