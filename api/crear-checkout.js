const FIRST_NIGHT_MXN = 1999;
const EXTRA_NIGHT_MXN = 799;
const MAX_NIGHTS = 30;

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function supabaseHeaders(prefer) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function createHold(startDate, endDate) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/create_reservation_hold`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_start_date: startDate, p_end_date: endDate })
  });
  const result = await response.json();
  if (!response.ok) {
    const message = result?.message || "";
    if (message.includes("DATES_UNAVAILABLE")) {
      const error = new Error("DATES_UNAVAILABLE");
      error.code = "DATES_UNAVAILABLE";
      throw error;
    }
    throw new Error(`Supabase hold failed: ${message}`);
  }
  return result;
}

async function updateReservation(id, values) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: supabaseHeaders("return=minimal"),
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error(`Supabase update failed: ${await response.text()}`);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método no permitido." });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: "La reservación todavía no está configurada. Inténtalo más tarde." });
  }

  const startDate = parseDate(request.body?.startDate);
  const endDate = parseDate(request.body?.endDate);
  if (!startDate || !endDate) return response.status(400).json({ error: "Selecciona fechas válidas." });

  const nights = Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
  if (nights < 1 || nights > MAX_NIGHTS) {
    return response.status(400).json({ error: `La estancia debe ser de 1 a ${MAX_NIGHTS} noches.` });
  }

  let hold;
  try {
    hold = await createHold(request.body.startDate, request.body.endDate);
  } catch (error) {
    if (error.code === "DATES_UNAVAILABLE") {
      return response.status(409).json({
        error: "Ya tenemos tres servicios activos durante una o más de esas noches. Elige otras fechas."
      });
    }
    console.error("Reservation hold failed", error);
    return response.status(500).json({ error: "No pudimos comprobar la disponibilidad. Inténtalo nuevamente." });
  }

  const totalMxn = FIRST_NIGHT_MXN + Math.max(0, nights - 1) * EXTRA_NIGHT_MXN;
  const siteUrl = process.env.SITE_URL || "https://camprocka.online";
  const displayDate = (value) => value.split("-").reverse().join("/");
  const description = `${nights} ${nights === 1 ? "noche" : "noches"} · ${displayDate(request.body.startDate)} al ${displayDate(request.body.endDate)} · IVA incluido. Incluye casa de campaña para 4 personas, 2 sillas, 2 lámparas, hielera, colchón y botiquín.`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("locale", "es-419");
  params.set("expires_at", String(Math.floor(Date.now() / 1000) + 30 * 60));
  params.set("success_url", `${siteUrl}/gracias?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${siteUrl}/reservar?fecha=${request.body.startDate}&salida=${request.body.endDate}`);
  params.set("phone_number_collection[enabled]", "true");
  params.set("custom_fields[0][key]", "delivery_area");
  params.set("custom_fields[0][label][type]", "custom");
  params.set("custom_fields[0][label][custom]", "Zona de entrega y recolección");
  params.set("custom_fields[0][type]", "dropdown");
  params.set("custom_fields[0][optional]", "false");
  params.set("custom_fields[0][dropdown][options][0][label]", "Ciudad de México");
  params.set("custom_fields[0][dropdown][options][0][value]", "cdmx");
  params.set("custom_fields[0][dropdown][options][1][label]", "Estado de México");
  params.set("custom_fields[0][dropdown][options][1][value]", "edomex");
  params.set("custom_fields[0][dropdown][options][2][label]", "Pachuca");
  params.set("custom_fields[0][dropdown][options][2][value]", "pachuca");
  params.set("submit_type", "book");
  params.set("custom_text[submit][message]", "Después del pago te contactaremos por WhatsApp para confirmar el domicilio y coordinar la entrega y recolección. El depósito reembolsable de $999 MXN se solicita hasta el día de la entrega.");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "mxn");
  params.set("line_items[0][price_data][unit_amount]", String(totalMxn * 100));
  params.set("line_items[0][price_data][product_data][name]", "Renta paquete básico Camp Rocka");
  params.set("line_items[0][price_data][product_data][description]", description);
  params.set("metadata[reservation_id]", hold.id);
  params.set("metadata[hold_token]", hold.hold_token);
  params.set("metadata[start_date]", request.body.startDate);
  params.set("metadata[end_date]", request.body.endDate);
  params.set("metadata[nights]", String(nights));
  params.set("metadata[total_mxn]", String(totalMxn));
  params.set("payment_intent_data[description]", `Camp Rocka · ${description}`);
  params.set("payment_intent_data[metadata][reservation_id]", hold.id);
  params.set("payment_intent_data[metadata][start_date]", request.body.startDate);
  params.set("payment_intent_data[metadata][end_date]", request.body.endDate);

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
      await updateReservation(hold.id, { status: "cancelled" }).catch(console.error);
      console.error("Stripe Checkout error", session?.error?.message);
      return response.status(502).json({ error: "Stripe no pudo iniciar el pago. Inténtalo nuevamente." });
    }

    await updateReservation(hold.id, { stripe_checkout_session_id: session.id });
    return response.status(200).json({ url: session.url });
  } catch (error) {
    await updateReservation(hold.id, { status: "cancelled" }).catch(console.error);
    console.error("Checkout request failed", error);
    return response.status(500).json({ error: "No pudimos conectar con Stripe. Inténtalo nuevamente." });
  }
}
