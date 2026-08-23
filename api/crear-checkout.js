const FIRST_NIGHT_MXN = 1999;
const EXTRA_NIGHT_MXN = 799;
const MAX_NIGHTS = 30;

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método no permitido." });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response.status(503).json({ error: "El pago todavía no está configurado. Inténtalo más tarde." });
  }

  const startDate = parseDate(request.body?.startDate);
  const endDate = parseDate(request.body?.endDate);
  if (!startDate || !endDate) return response.status(400).json({ error: "Selecciona fechas válidas." });

  const nights = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  if (nights < 1 || nights > MAX_NIGHTS) {
    return response.status(400).json({ error: `La estancia debe ser de 1 a ${MAX_NIGHTS} noches.` });
  }

  const totalMxn = FIRST_NIGHT_MXN + Math.max(0, nights - 1) * EXTRA_NIGHT_MXN;
  const siteUrl = process.env.SITE_URL || "https://camprocka.online";
  const description = `${nights} ${nights === 1 ? "noche" : "noches"} · ${request.body.startDate} al ${request.body.endDate} · IVA incluido. Incluye casa de campaña para hasta 4 personas, 2 sillas, 2 lámparas, hielera, colchón inflable y botiquín. Entrega 1 o 2 días antes y recolección en el mismo domicilio. Depósito reembolsable de $999 MXN requerido el día de la entrega.`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("locale", "es");
  params.set("success_url", `${siteUrl}/gracias?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${siteUrl}/reservar?fecha=${request.body.startDate}&salida=${request.body.endDate}`);
  params.set("phone_number_collection[enabled]", "true");
  params.set("billing_address_collection", "required");
  params.set("submit_type", "book");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "mxn");
  params.set("line_items[0][price_data][unit_amount]", String(totalMxn * 100));
  params.set("line_items[0][price_data][product_data][name]", "Renta paquete básico Camp Rocka");
  params.set("line_items[0][price_data][product_data][description]", description);
  params.set("metadata[start_date]", request.body.startDate);
  params.set("metadata[end_date]", request.body.endDate);
  params.set("metadata[nights]", String(nights));
  params.set("metadata[total_mxn]", String(totalMxn));
  params.set("payment_intent_data[description]", `Camp Rocka · ${description}`);

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok) {
      console.error("Stripe Checkout error", session?.error?.message);
      return response.status(502).json({ error: "Stripe no pudo iniciar el pago. Revisa la configuración e inténtalo nuevamente." });
    }
    return response.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Checkout request failed", error);
    return response.status(500).json({ error: "No pudimos conectar con Stripe. Inténtalo nuevamente." });
  }
}
