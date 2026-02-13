// Twilio integration via Replit Connectors
import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export async function getMessagingServiceSid() {
  const client = await getTwilioClient();
  const services = await client.messaging.v1.services.list({ limit: 1 });
  return services.length > 0 ? services[0].sid : null;
}

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const cleaned = digits.replace(/^1/, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSMS(to: string, body: string) {
  const normalizedTo = normalizePhoneNumber(to);
  console.log(`[SMS] Sending to ${normalizedTo} (original: ${to}), body length: ${body.length}`);
  const client = await getTwilioClient();
  const messagingServiceSid = await getMessagingServiceSid();

  if (messagingServiceSid) {
    const message = await client.messages.create({
      body,
      messagingServiceSid,
      to: normalizedTo,
    });
    console.log(`[SMS] Sent via messaging service. SID: ${message.sid}, Status: ${message.status}`);
    return message;
  }

  const from = await getTwilioFromPhoneNumber();
  if (!from) {
    throw new Error('No Twilio phone number configured');
  }
  const message = await client.messages.create({
    body,
    from,
    to: normalizedTo,
  });
  console.log(`[SMS] Sent via direct number. SID: ${message.sid}, Status: ${message.status}`);
  return message;
}

export async function makeCall(to: string, twimlUrl: string) {
  const client = await getTwilioClient();
  const from = await getTwilioFromPhoneNumber();
  if (!from) {
    throw new Error('No Twilio phone number configured');
  }
  const call = await client.calls.create({
    url: twimlUrl,
    from,
    to,
  });
  return call;
}
