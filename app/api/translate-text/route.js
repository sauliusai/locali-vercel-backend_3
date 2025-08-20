export const runtime = 'nodejs';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
export async function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders }); }
const json = (data, init = {}) =>
  new Response(JSON.stringify(data), { status: init.status || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

export async function POST(req) {
  try {
    const body = await req.json();
    const { type = 'website', url, targetLocale } = body || {};
    if (type !== 'website') return json({ error: 'type must be "website"' }, { status: 400 });
    if (!url || !/^https?:\/\//i.test(url)) return json({ error: 'Provide a valid URL starting with http(s)://' }, { status: 400 });
    if (!targetLocale) return json({ error: 'Provide targetLocale' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });

    const html = await fetch(url, { headers: { 'User-Agent': 'LocaliBot/1.0' } }).then(r => r.text());
    const $ = cheerio.load(html);

    const title = clean($('title').first().text());
    const metaDescription = clean($('meta[name="description"]').attr('content') || '');

    const segments = [];
    let h1c = 0, h2c = 0, h3c = 0, pc = 0;
    $('h1').each((_, el) => { const t = clean($(el).text()); if (t) { h1c++; segments.push({ key: `h1-${h1c}`, src: t }); }});
    $('h2').each((_, el) => { const t = clean($(el).text()); if (t) { h2c++; segments.push({ key: `h2-${h2c}`, src: t }); }});
    $('h3').each((_, el) => { const t = clean($(el).text()); if (t) { h3c++; segments.push({ key: `h3-${h3c}`, src: t }); }});
    $('p').each((_, el) => { const t = clean($(el).text()); if (t && t.length > 2) { pc++; segments.push({ key: `p-${pc}`, src: t }); }});

    const limited = segments.slice(0, 120);

    const sys = `You are a professional localization specialist. Translate each "src" to ${targetLocale}.
Return ONLY JSON array of {"key","tgt"}. Keep placeholders {like_this}, %s, and URLs intact.`;
    const user = JSON.stringify(limited);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || '[]';
    let arr = [];
    try { arr = JSON.parse(content); } catch { arr = []; }
    const tgtMap = Object.fromEntries(arr.map(o => [o.key, o.tgt]));
    const finalSegs = limited.map(s => ({ key: s.key, src: s.src, tgt: tgtMap[s.key] || '' }));

    return json({
      summary: { title, metaDescription, counts: { h1: h1c, h2: h2c, h3: h3c, p: pc } },
      segments: finalSegs
    });
  } catch (e) {
    return json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
