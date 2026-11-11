import type { APIRoute } from 'astro';
import { abs } from '../config';

// Search crawlers, then AI answer and AI training crawlers. Every agent is allowed everywhere ("User-agent: *" below
// already says so); naming them makes the choice explicit. To opt out of one, give it "Disallow: /" instead.
const agents = [
  'Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot',
  'GPTBot', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended', 'Applebot-Extended', 'Perplexity-User',
];

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
