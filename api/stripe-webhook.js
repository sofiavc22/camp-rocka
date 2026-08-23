import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function validStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload.toString("utf8")}`).digest("hex");
  return signatures.some((signature) => {
    const left = Buffer.from(expected, "hex");
    const right = Buffer.from(signature, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));

const formatDate = (value) => value ? value.split("-").reverse().join("/") : "Por confirmar";
const formatMoney = (amount) => new Intl.NumberFormat("es-MX", {
  style: "currency", currency: "MXN", minimumFractionDigits: 2
}).format((amount || 0) / 100);

function areaLabel(session) {
  const field = session.custom_fields?.find((item) => item.key === "delivery_area");
  const value = field?.dropdown?.value;
  return { cdmx: "Ciudad de México", edomex: "Estado de México", pachuca: "Pachuca" }[value] || "Por confirmar";
}

function confirmationEmail(session) {
  const metadata = session.metadata || {};
  const name = escapeHtml(session.customer_details?.name || "Campista");
  const nights = escapeHtml(metadata.nights || "");
  const start = escapeHtml(formatDate(metadata.start_date));
  const end = escapeHtml(formatDate(metadata.end_date));
  const area = escapeHtml(areaLabel(session));
  const total = escapeHtml(formatMoney(session.amount_total));

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f4ef;font-family:Arial,sans-serif;color:#18372d">
  <div style="max-width:640px;margin:0 auto;padding:32px 18px">
    <div style="background:#18372d;border-radius:22px 22px 0 0;padding:32px 28px;text-align:center">
      <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:900;letter-spacing:1px;line-height:1">
        <span style="color:#f2b62f">CAMP</span> <span style="color:#ffffff">ROCKA</span>
      </div>
      <div style="color:#cbd9d2;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:9px">Todo para acampar</div>
    </div>
    <div style="background:#fff;padding:38px 34px;border-radius:0 0 22px 22px">
      <p style="margin:0 0 8px;color:#b77b00;font-weight:bold;text-transform:uppercase;font-size:12px;letter-spacing:1.5px">Reservación confirmada</p>
      <h1 style="font-size:32px;line-height:1.1;margin:0 0 18px">Tu aventura ya está confirmada.</h1>
      <p style="font-size:17px;line-height:1.6;color:#53665f">Hola, ${name}. Recibimos correctamente tu pago. Te contactaremos por WhatsApp hasta 48 horas antes de la entrega para que nos compartas la dirección exacta y coordinemos el horario. Al finalizar tu campamento, recogeremos el equipo en ese mismo domicilio.</p>
      <div style="background:#edf2e8;border-radius:16px;padding:22px;margin:26px 0">
        <table role="presentation" width="100%" style="border-collapse:collapse;font-size:15px">
          <tr><td style="padding:8px 0;color:#64756f">Campamento</td><td align="right" style="font-weight:bold">${start} al ${end}</td></tr>
          <tr><td style="padding:8px 0;color:#64756f">Duración</td><td align="right" style="font-weight:bold">${nights} ${nights === "1" ? "noche" : "noches"}</td></tr>
          <tr><td style="padding:8px 0;color:#64756f">Zona</td><td align="right" style="font-weight:bold">${area}</td></tr>
          <tr><td style="padding:8px 0;color:#64756f">Total pagado</td><td align="right" style="font-weight:bold">${total} MXN</td></tr>
        </table>
      </div>
      <h2 style="font-size:20px;margin:28px 0 10px">Tu paquete incluye</h2>
      <p style="line-height:1.65;color:#53665f">Casa de campaña para hasta 4 personas, 2 sillas, 2 lámparas nocturnas, hielera, colchón inflable y botiquín. El IVA está incluido.</p>
      <div style="border-left:4px solid #f2b62f;padding:4px 0 4px 16px;margin:26px 0;color:#53665f;line-height:1.55">
        El día de la entrega se solicitará un depósito de garantía reembolsable de <strong>$999 MXN</strong>.
      </div>
      <p style="font-size:13px;color:#82908b;margin-top:30px">Camp Rocka · Entrega y recolección a domicilio en CDMX, Estado de México y Pachuca.</p>
    </div>
  </div>
</body></html>`;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  };
}

async function confirmReservation(session) {
  const reservationId = session.metadata?.reservation_id;
  if (!reservationId) return;

  const field = session.custom_fields?.find((item) => item.key === "delivery_area");
  const deliveryArea = field?.dropdown?.value || null;
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(reservationId)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        customer_name: session.customer_details?.name || null,
        customer_email: session.customer_details?.email || session.customer_email || null,
        customer_phone: session.customer_details?.phone || null,
        delivery_area: deliveryArea,
        total_mxn: Math.round((session.amount_total || 0) / 100)
      })
    }
  );
  if (!response.ok) throw new Error(`Supabase confirmation failed: ${await response.text()}`);
}

async function keepReservationPending(session) {
  const reservationId = session.metadata?.reservation_id;
  if (!reservationId) return;

  const pendingUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(reservationId)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        status: "holding",
        hold_expires_at: pendingUntil,
        updated_at: new Date().toISOString(),
        stripe_checkout_session_id: session.id
      })
    }
  );
  if (!response.ok) throw new Error(`Supabase pending update failed: ${await response.text()}`);
}

async function cancelPendingReservation(session) {
  const reservationId = session.metadata?.reservation_id;
  if (!reservationId) return;

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/reservations?id=eq.${encodeURIComponent(reservationId)}&status=eq.holding`,
    {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
    }
  );
  if (!response.ok) throw new Error(`Supabase cancellation failed: ${await response.text()}`);
}

async function sendConfirmation(session, eventId) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) throw new Error("Checkout session has no customer email");

  const message = {
    from: "Camp Rocka <reservas@camprocka.online>",
    to: [email],
    subject: "Tu reservación Camp Rocka está confirmada",
    html: confirmationEmail(session)
  };
  if (process.env.RESERVATIONS_EMAIL) {
    message.bcc = [process.env.RESERVATIONS_EMAIL];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `stripe-${eventId}`
    },
    body: JSON.stringify(message)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || "Resend rejected the email");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Método no permitido" });
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.RESEND_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return response.status(503).json({ error: "Webhook no configurado" });
  }

  const rawBody = await readRawBody(request);
  if (!validStripeSignature(rawBody, request.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET)) {
    return response.status(400).json({ error: "Firma inválida" });
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  const session = event.data?.object;

  try {
    if (event.type === "checkout.session.completed") {
      if (session?.payment_status === "paid") {
        await confirmReservation(session);
        await sendConfirmation(session, event.id);
      } else {
        // OXXO genera el comprobante primero y confirma el pago después.
        // Conservamos la disponibilidad mientras el cliente realiza el pago.
        await keepReservationPending(session);
      }
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      await confirmReservation(session);
      await sendConfirmation(session, event.id);
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      await cancelPendingReservation(session);
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return response.status(500).json({ error: "No se pudo procesar el evento de Stripe" });
  }

  return response.status(200).json({ received: true });
}
