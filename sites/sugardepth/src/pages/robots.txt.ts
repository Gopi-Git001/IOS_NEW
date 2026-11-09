import type { APIRoute } from 'astro';
import { abs } from '../config';

const agents = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot'];

export const GET: APIRoute = () =>
  new Response(
    [
      ...agents.flatMap((a) => [`User-agent: ${a}`, 'Allow: /', '']),
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${abs('/sitemap-index.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
