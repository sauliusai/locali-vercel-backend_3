export const runtime = 'nodejs';
import OpenAI from 'openai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
export async function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders }); }
const json = (data, init = {}) =>
  new Response(JSON.stringify(data), { status: init.status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) return json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const body = await req.json();
    const { type = 'ad', targetLocale, image } = body || {};
    if (!targetLocale) return json({ error: 'Provide targetLocale' }, { status: 400 });
    if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
      return json({ error: 'Provide base64 data URL in "image"' }, { status: 400 });
    }

    const prompt = `Extract all visible text from the image and translate to ${targetLocale}.
Return ONLY JSON array: [{"src":"<original>","tgt":"<translated>"}]. Combine nearby short items.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are an OCR + translation assistant.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        }
      ]
    });

    let texts = [];
    try { texts = JSON.parse(completion.choices?.[0]?.message?.content || '[]'); } catch { texts = []; }
    return json({ image, texts, kind: type });
  } catch (e) {
    return json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
