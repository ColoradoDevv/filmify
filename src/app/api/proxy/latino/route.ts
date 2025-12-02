// app/api/proxy/latino/route.ts
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new Response('Bad request', { status: 400 });

    try {
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.delete('connection');
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        headers.set('Referer', new URL(url).origin);
        headers.set('Origin', new URL(url).origin);

        const body = request.method !== 'GET' && request.method !== 'HEAD'
            ? await request.blob()
            : undefined;

        const res = await fetch(url, {
            method: request.method,
            headers: headers,
            body: body,
            redirect: 'follow'
        });

        const contentType = res.headers.get('content-type') || '';
        const isHtml = contentType.includes('text/html');

        if (isHtml) {
            const html = await res.text();
            const targetUrlObj = new URL(url);
            const baseOrigin = targetUrlObj.origin;

            const interceptorScript = `
                <script>
                    (function() {
                        console.log('[Proxy Interceptor] Initializing...');
                        const PROXY_BASE = '/api/proxy/latino?url=';
                        const originalFetch = window.fetch;
                        const originalXHR = window.XMLHttpRequest;

                        function getProxiedUrl(target) {
                            try {
                                if (!target) return target;
                                if (typeof target !== 'string') return target;
                                
                                // Don't proxy data URLs or blobs
                                if (target.startsWith('data:') || target.startsWith('blob:')) return target;

                                if (target.startsWith('/') && !target.startsWith('//')) {
                                    const resolved = new URL(target, document.baseURI).href;
                                    return PROXY_BASE + encodeURIComponent(resolved);
                                }
                                if (target.startsWith('http')) {
                                    if (target.includes(window.location.host)) return target; 
                                    return PROXY_BASE + encodeURIComponent(target);
                                }
                                return target;
                            } catch(e) { return target; }
                        }

                        window.fetch = async function(input, init) {
                            let url = input;
                            if (input instanceof Request) {
                                url = input.url;
                            }
                            const proxiedUrl = getProxiedUrl(url);
                            // console.log('[Proxy Interceptor] Fetch:', url, '->', proxiedUrl);
                            
                            if (input instanceof Request) {
                                // Clone the request with the new URL
                                const newReq = new Request(proxiedUrl, {
                                    method: input.method,
                                    headers: input.headers,
                                    body: input.body,
                                    mode: input.mode,
                                    credentials: input.credentials,
                                    cache: input.cache,
                                    redirect: input.redirect,
                                    referrer: input.referrer,
                                    integrity: input.integrity,
                                });
                                return originalFetch(newReq, init);
                            }
                            
                            return originalFetch(proxiedUrl, init);
                        };

                        const originalOpen = XMLHttpRequest.prototype.open;
                        XMLHttpRequest.prototype.open = function(method, url, ...args) {
                            const proxiedUrl = getProxiedUrl(url);
                            // console.log('[Proxy Interceptor] XHR:', url, '->', proxiedUrl);
                            return originalOpen.call(this, method, proxiedUrl, ...args);
                        };
                        console.log('[Proxy Interceptor] Active');
                    })();
                </script>
            `;

            let modifiedHtml = html;
            // Try to inject after <head> (case insensitive)
            if (/<head>/i.test(html)) {
                modifiedHtml = html.replace(/<head>/i, `<head><base href="${baseOrigin}/">${interceptorScript}`);
            } else if (/<html[^>]*>/i.test(html)) {
                // Fallback: inject after <html>
                modifiedHtml = html.replace(/(<html[^>]*>)/i, `$1<head><base href="${baseOrigin}/">${interceptorScript}</head>`);
            } else {
                // Last resort: prepend
                modifiedHtml = `<head><base href="${baseOrigin}/">${interceptorScript}</head>` + html;
            }

            console.log(`[Proxy] HTML processed: ${url}`);

            return new Response(modifiedHtml, {
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600',
                    'X-Frame-Options': '',
                    'Content-Security-Policy': ''
                }
            });
        } else {
            // Forward non-HTML content (scripts, images, json)
            const blob = await res.blob();
            console.log(`[Proxy] Passthrough: ${url} (${contentType})`);
            return new Response(blob, {
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }

    } catch (e) {
        console.error(`[Proxy] Error: ${url}`, e);
        return new Response('Proxy Error', { status: 500 });
    }
}
