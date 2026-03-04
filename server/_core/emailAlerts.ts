/**
 * emailAlerts.ts
 * Sends critical supply chain disruption alert emails to all subscribers
 * via the Resend transactional email API.
 */

import { Resend } from "resend";
import { ENV } from "./env";
import { NewsItem } from "../routers/news";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

// ─── HTML email template ──────────────────────────────────────────────────────

function buildAlertEmailHtml(items: NewsItem[], subscriberName: string): string {
  const criticalItems = items.filter((i) => i.severity === "critical");
  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const itemsHtml = criticalItems
    .map(
      (item) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #1e2a3a;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="
            display: inline-block;
            background: #ef4444;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
            margin-top: 2px;
          ">CRITICAL</span>
          <div>
            <div style="font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px; line-height: 1.4;">
              ${item.title}
            </div>
            <div style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 8px;">
              ${item.summary}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
              ${item.etaImpact ? `<span style="font-size: 11px; background: rgba(239,68,68,0.12); color: #fca5a5; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.2);">⏱ ${item.etaImpact}</span>` : ""}
              ${item.costImpact ? `<span style="font-size: 11px; background: rgba(249,115,22,0.12); color: #fdba74; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(249,115,22,0.2);">💰 ${item.costImpact}</span>` : ""}
              <span style="font-size: 11px; color: #64748b;">${item.source}</span>
              <a href="${item.url}" style="font-size: 11px; color: #E91E8C; text-decoration: none;">Read more →</a>
            </div>
          </div>
        </div>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Critical Supply Chain Alert — Freight Intel</title>
</head>
<body style="margin: 0; padding: 0; background: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0e1a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Gradient top bar -->
                    <div style="height: 3px; background: linear-gradient(90deg, #E91E8C, #f97316); border-radius: 2px 2px 0 0;"></div>
                    <div style="background: #0f1422; border: 1px solid rgba(233,30,140,0.2); border-top: none; border-radius: 0 0 12px 12px; padding: 24px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td>
                            <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.04em; background: linear-gradient(90deg, #E91E8C, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                              Freight Intel
                            </div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px; letter-spacing: 0.08em; text-transform: uppercase;">
                              Supply Chain Intelligence
                            </div>
                          </td>
                          <td align="right">
                            <span style="
                              display: inline-block;
                              background: rgba(239,68,68,0.15);
                              border: 1px solid rgba(239,68,68,0.4);
                              color: #ef4444;
                              font-size: 11px;
                              font-weight: 700;
                              letter-spacing: 0.08em;
                              padding: 4px 12px;
                              border-radius: 20px;
                            ">🔴 CRITICAL ALERT</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert body card -->
          <tr>
            <td>
              <div style="background: #0f1422; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 28px;">

                <!-- Greeting -->
                <div style="font-size: 16px; color: #f1f5f9; font-weight: 600; margin-bottom: 6px;">
                  Hi ${subscriberName},
                </div>
                <div style="font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.6;">
                  Freight Intel has detected <strong style="color: #ef4444;">${criticalItems.length} critical supply chain disruption${criticalItems.length > 1 ? "s" : ""}</strong> that may impact your margins. Here's what you need to know:
                </div>

                <!-- Disruption items -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                </table>

                <!-- CTA -->
                <div style="margin-top: 28px; text-align: center;">
                  <a href="https://margin-sentinel.manus.space" style="
                    display: inline-block;
                    background: linear-gradient(90deg, #E91E8C, #f97316);
                    color: #fff;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    padding: 12px 32px;
                    border-radius: 8px;
                    text-decoration: none;
                    text-transform: uppercase;
                  ">VIEW LIVE DASHBOARD →</a>
                </div>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <div style="font-size: 12px; color: rgba(255,255,255,0.2); line-height: 1.6;">
                Sent by Freight Intel · ${now}<br/>
                You're receiving this because you subscribed to critical disruption alerts.<br/>
                <span style="color: rgba(255,255,255,0.15);">To unsubscribe, reply with "unsubscribe" to this email.</span>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── plain text fallback ──────────────────────────────────────────────────────

function buildAlertEmailText(items: NewsItem[], subscriberName: string): string {
  const criticalItems = items.filter((i) => i.severity === "critical");
  const lines = [
    `Hi ${subscriberName},`,
    ``,
    `Freight Intel has detected ${criticalItems.length} critical supply chain disruption(s):`,
    ``,
    ...criticalItems.map(
      (item, i) =>
        `${i + 1}. [CRITICAL] ${item.title}\n   ${item.summary}${item.etaImpact ? `\n   ETA Impact: ${item.etaImpact}` : ""}${item.costImpact ? `\n   Cost Impact: ${item.costImpact}` : ""}\n   Source: ${item.source}\n   ${item.url}`
    ),
    ``,
    `View the live dashboard: https://margin-sentinel.manus.space`,
    ``,
    `—`,
    `Freight Intel · Supply Chain Intelligence`,
    `To unsubscribe, reply with "unsubscribe".`,
  ];
  return lines.join("\n");
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface AlertEmailResult {
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Send a critical disruption alert email to a single subscriber.
 */
export async function sendAlertEmail(
  subscriberEmail: string,
  subscriberName: string,
  criticalItems: NewsItem[]
): Promise<AlertEmailResult> {
  if (criticalItems.length === 0) {
    return { email: subscriberEmail, success: false, error: "No critical items to send" };
  }

  try {
    const resend = getResend();
    const count = criticalItems.length;
    const subject =
      count === 1
        ? `🔴 Critical Alert: ${criticalItems[0].title.slice(0, 60)}${criticalItems[0].title.length > 60 ? "…" : ""}`
        : `🔴 ${count} Critical Supply Chain Disruptions Detected`;

    const { error } = await resend.emails.send({
      from: `Freight Intel <${ENV.alertFromEmail}>`,
      to: subscriberEmail,
      subject,
      html: buildAlertEmailHtml(criticalItems, subscriberName),
      text: buildAlertEmailText(criticalItems, subscriberName),
    });

    if (error) {
      console.error(`[alerts] Failed to send to ${subscriberEmail}:`, error);
      return { email: subscriberEmail, success: false, error: String(error) };
    }

    console.log(`[alerts] Sent alert to ${subscriberEmail}`);
    return { email: subscriberEmail, success: true };
  } catch (err: any) {
    console.error(`[alerts] Exception sending to ${subscriberEmail}:`, err);
    return { email: subscriberEmail, success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Broadcast a critical disruption alert to a list of subscribers.
 * Sends in parallel but caps concurrency to avoid rate limits.
 */
export async function broadcastAlertEmails(
  subscribers: Array<{ email: string; name: string }>,
  criticalItems: NewsItem[]
): Promise<AlertEmailResult[]> {
  if (subscribers.length === 0 || criticalItems.length === 0) return [];

  console.log(`[alerts] Broadcasting to ${subscribers.length} subscriber(s) — ${criticalItems.length} critical item(s)`);

  // Send in batches of 5 to respect Resend rate limits
  const results: AlertEmailResult[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((sub) => sendAlertEmail(sub.email, sub.name, criticalItems))
    );
    results.push(...batchResults);

    // Small delay between batches
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`[alerts] Broadcast complete: ${successCount}/${subscribers.length} sent successfully`);
  return results;
}
