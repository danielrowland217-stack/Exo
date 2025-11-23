import type { NextApiRequest, NextApiResponse } from 'next';

const VERIFICATION_TOKEN = process.env.WHATSAPP_VERIFICATION_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function sendMessage(to: string, message: string) {
  const url = `https://graph.facebook.com/v15.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    text: { body: message }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to send WhatsApp message:', errorText);
    throw new Error(`WhatsApp API error: ${errorText}`);
  }

  return res.json();
}

async function callOpenAI(message: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment variables.');
  }
  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: message
      }
    ],
    stream: false
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Failed to get response from OpenAI:', errorText);
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Webhook verification
    console.log('Webhook verification request query:', req.query);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFICATION_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge as string);
    } else {
      console.error('Verification failed. Mode:', mode, 'Token:', token, 'Expected Token:', VERIFICATION_TOKEN);
      res.status(403).send('Verification failed');
    }
    return;
  }

  if (req.method === 'POST') {
    console.log('Received WhatsApp webhook event:', JSON.stringify(req.body, null, 2));
    try {
      const body = req.body;

      // Basic validation of webhook event structure
      if (
        body.object === 'whatsapp_business_account' &&
        body.entry &&
        Array.isArray(body.entry) &&
        body.entry[0].changes &&
        Array.isArray(body.entry[0].changes)
      ) {
        const changes = body.entry[0].changes[0];
        const messages = changes.value.messages;

        if (messages && messages.length > 0) {
          const message = messages[0];
          const from = message.from; // WhatsApp sender number
          let text = '';

          if (message.text) {
            text = message.text.body;
          } else if (message.image && message.image.caption) {
            text = message.image.caption;
          } else {
            text = 'Unsupported message type.';
          }

          // Call OpenAI
          const openaiReply = await callOpenAI(text);

          // Send reply back to WhatsApp user
          await sendMessage(from, openaiReply);
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Error handling WhatsApp webhook POST:', error);
      res.status(500).send('Internal Server Error');
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
