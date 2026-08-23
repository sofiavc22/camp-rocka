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
    <div style="background:#18372d;border-radius:22px 22px 0 0;padding:28px;text-align:center">
      <img src="https://camprocka.online/camp-rocka-logo.webp" alt="Camp Rocka" width="92" style="display:block;margin:0 auto">
    </div>
    <div style="background:#fff;padding:38px 34px;border-radius:0 0 22px 22px">
      <p style="margin:0 0 8px;color:#b77b00;font-weight:bold;text-transform:uppercase;font-size:12px;letter-spacing:1.5px">Reservación confirmada</p>
      <h1 style="font-size:32px;line-height:1.1;margin:0 0 18px">Tu aventura ya está confirmada.</h1>
      <p style="font-size:17px;line-height:1.6;color:#53665f">Hola, ${name}. Recibimos correctamente tu pago. Te contactaremos por WhatsApp para confirmar el domicilio y coordinar la entrega y recolección.</p>
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

async function sendConfirmation(session, eventId) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) throw new Error("Checkout session has no customer email");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `stripe-${eventId}`
    },
    body: JSON.stringify({
      from: "Camp Rocka <reservas@camprocka.online>",
      to: [email],
      subject: "Tu reservación Camp Rocka está confirmada",
      html: confirmationEmail(session)
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.message || "Resend rejected the email");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Método no permitido" });
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.RESEND_API_KEY) {
    return response.status(503).json({ error: "Webhook no configurado" });
  }

  const rawBody = await readRawBody(request);
  if (!validStripeSignature(rawBody, request.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET)) {
    return response.status(400).json({ error: "Firma inválida" });
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid") {
    try {
      await sendConfirmation(event.data.object, event.id);
    } catch (error) {
      console.error("Confirmation email failed", error);
      return response.status(500).json({ error: "No se pudo enviar el correo" });
    }
  }

  return response.status(200).json({ received: true });
}
