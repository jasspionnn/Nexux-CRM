export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.pathname.split('/bio/')[1];

  if (!slug) {
    return new Response(renderError('Página não encontrada'), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const page = await env.DB.prepare(
      'SELECT * FROM bio_links WHERE slug = ? AND is_active = 1'
    ).bind(slug).first();

    if (!page) {
      return new Response(renderError('Este link de bio não existe ou foi removido.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Increment click count
    await env.DB.prepare(
      'UPDATE bio_links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(page.id).run();

    const links = page.links ? JSON.parse(page.links) : [];

    // These fields are set via an unauthenticated-by-ownership PUT endpoint, so they
    // are treated as untrusted: colors are validated as CSS color tokens, the radius
    // as a plain number, and every other value is HTML-escaped before interpolation.
    const safeColor = (v: any, fallback: string) =>
      typeof v === 'string' && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/.test(v.trim()) ? v.trim() : fallback;
    const bgColor = safeColor(page.bg_color, '#0f172a');
    const textColor = safeColor(page.text_color, '#f8fafc');
    const buttonColor = safeColor(page.button_color, '#0d9488');
    const buttonTextColor = safeColor(page.button_text_color, '#ffffff');
    const buttonRadius = Number.isFinite(Number(page.button_radius)) ? Number(page.button_radius) : 12;
    const avatarUrl = typeof page.avatar_url === 'string' ? escapeHtml(page.avatar_url) : '';

    const avatarHTML = avatarUrl
      ? `<div class="avatar" style="border-color: ${buttonColor}"><img src="${avatarUrl}" alt="" /></div>`
      : `<div class="avatar" style="background-color: ${buttonColor}; color: ${buttonTextColor}; border-color: ${buttonColor}">${escapeHtml(page.title).charAt(0).toUpperCase()}</div>`;

    const linksHTML = links
      .filter((l: any) => l.label && l.url)
      .map((link: any) => `
        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-btn" data-link-id="${page.id}" data-link-label="${escapeHtml(link.label)}" data-link-url="${escapeHtml(link.url)}" style="background-color: ${buttonColor}; color: ${buttonTextColor}; border-radius: ${buttonRadius}px;">
          ${link.icon ? `<span class="link-icon">${escapeHtml(link.icon)}</span>` : ''}
          <span class="link-label">${escapeHtml(link.label)}</span>
        </a>
      `).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(page.title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; justify-content: center; }
      #app { width: 100%; max-width: 480px; min-height: 100vh; }
      .profile-section { text-align: center; padding: 3rem 1.5rem 1.5rem; }
      .avatar { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; border: 3px solid; overflow: hidden; }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .profile-title { font-size: 1.25rem; font-weight: 900; }
      .profile-desc { font-size: 0.875rem; margin-top: 0.25rem; opacity: 0.8; }
      .links-section { padding: 0 1rem 2rem; }
      .link-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem; font-size: 0.875rem; font-weight: 700; text-decoration: none; transition: transform 0.15s; cursor: pointer; border: none; width: 100%; text-align: left; }
      .link-btn:hover { transform: scale(1.02); }
      .link-icon { font-size: 1.25rem; flex-shrink: 0; }
      .link-label { flex: 1; }
      .footer { text-align: center; padding: 1.5rem; font-size: 0.625rem; opacity: 0.4; }
    </style>
  </head>
  <body>
    <div id="app">
      <div style="background-color: ${bgColor}; color: ${textColor}; min-height: 100vh;">
        <div class="profile-section">
          ${avatarHTML}
          <h1 class="profile-title" style="color: ${textColor}">${escapeHtml(page.title)}</h1>
          ${page.description ? `<p class="profile-desc" style="color: ${textColor}">${escapeHtml(page.description)}</p>` : ''}
        </div>
        <div class="links-section">
          ${linksHTML}
        </div>
        <div class="footer" style="color: ${textColor}">Feito com Nexux CRM</div>
      </div>
    </div>
    <script>
      // Track link clicks
      document.querySelectorAll('.link-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          const data = {
            account_id: '${page.account_id}',
            link_label: this.dataset.linkLabel,
            link_url: this.dataset.linkUrl,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent || ''
          };
          fetch('/api/bio-links/${page.id}/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).catch(() => {});
        });
      });
    </script>
  </body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return new Response(renderError('Erro ao carregar a página'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function renderError(msg: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Erro</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#f8fafc;text-align:center;padding:2rem}</style>
</head>
<body><div><h2 style="font-size:1.5rem;font-weight:900;margin-bottom:.5rem">Página não encontrada</h2><p style="opacity:.8">${msg}</p></div></body>
</html>`;
}

function escapeHtml(str: string) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
