
interface TelnyxCredentials {
  apiKey: string;
  phoneNumber: string;
}

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const cleaned = digits.replace(/^1/, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export async function makeTelnyxCall(
  credentials: TelnyxCredentials,
  to: string,
  webhookUrl: string,
) {
  const normalizedTo = normalizePhoneNumber(to);
  console.log(`[Telnyx] Making call to ${normalizedTo}`);

  const response = await fetch("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`,
    },
    body: JSON.stringify({
      connection_id: await getTelnyxConnectionId(credentials.apiKey),
      to: normalizedTo,
      from: credentials.phoneNumber,
      webhook_url: webhookUrl,
      webhook_url_method: "POST",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telnyx call error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  return {
    callControlId: data.data?.call_control_id,
    callLegId: data.data?.call_leg_id,
    callSessionId: data.data?.call_session_id,
  };
}

export async function sendTelnyxSMS(
  credentials: TelnyxCredentials,
  to: string,
  body: string
) {
  const normalizedTo = normalizePhoneNumber(to);
  console.log(`[Telnyx SMS] Sending to ${normalizedTo}, body length: ${body.length}`);

  const response = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`,
    },
    body: JSON.stringify({
      from: credentials.phoneNumber,
      to: normalizedTo,
      text: body,
      type: "SMS",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telnyx SMS error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  console.log(`[Telnyx SMS] Sent. ID: ${data.data?.id}`);
  return data.data;
}

async function getTelnyxConnectionId(apiKey: string): Promise<string> {
  const response = await fetch("https://api.telnyx.com/v2/credential_connections?page[size]=1", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const fallbackResp = await fetch("https://api.telnyx.com/v2/outbound_voice_profiles?page[size]=1", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (fallbackResp.ok) {
      const fallbackData: any = await fallbackResp.json();
      if (fallbackData.data?.[0]?.id) return fallbackData.data[0].id;
    }
    throw new Error("No Telnyx connection found. Please set up a credential connection in your Telnyx portal.");
  }

  const data: any = await response.json();
  if (data.data?.[0]?.id) return data.data[0].id;

  throw new Error("No Telnyx credential connection found. Please create one in your Telnyx Mission Control portal.");
}

export async function validateTelnyxCredentials(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.telnyx.com/v2/balance", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
