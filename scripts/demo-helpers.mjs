/**
 * Visual polish helpers for the Sprint 4 demo recording.
 *
 * All effects work via in-page DOM injection (Playwright `page.evaluate`)
 * so the whole video is recorded by the browser itself — no external
 * compositor / editor needed.
 *
 * Pieces:
 *   - titleCard: full-screen intro/outro with brand mark
 *   - caption:   floating banner at the top of the page
 *   - spotlight: dim the whole page except a target element
 *   - zoomIn:    smoothly clone-and-scale a target element
 *   - stepBadge: small "N/M · Title" indicator top-right
 *   - crossFade: fade the body out, run a callback, fade back in
 */

export const VIEWPORT = { width: 1280, height: 720 };

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- title card ----------

export async function titleCard(page, title, subtitle = '', durationMs = 4000) {
  await page.evaluate(
    ({ title, subtitle }) => {
      const id = '__demo_title_card__';
      let el = document.getElementById(id);
      if (el) el.remove();
      el = document.createElement('div');
      el.id = id;
      el.style.cssText = `
        position: fixed; inset: 0;
        background: radial-gradient(circle at 50% 40%, #1E293B 0%, #0F172A 100%);
        z-index: 100000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 20px;
        opacity: 0;
        transition: opacity 450ms cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Lexend', system-ui, sans-serif;
        color: white;
        padding: 32px;
      `;
      el.innerHTML = `
        <div style="width: 96px; height: 96px;
                    background: hsl(221 83% 53%);
                    border-radius: 24px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 24px 64px rgba(37, 99, 235, 0.4);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
               stroke="white" stroke-width="2.25"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
        </div>
        <h1 style="font-size: 56px; font-weight: 600; letter-spacing: -0.025em;
                   margin: 0; text-align: center; line-height: 1.1;">
          ${title}
        </h1>
        ${subtitle ? `<p style="font-size: 22px; opacity: 0.7; margin: 0;
                                text-align: center; max-width: 720px;
                                font-weight: 300; line-height: 1.45;">
                       ${subtitle}
                     </p>` : ''}
      `;
      document.body.appendChild(el);
      requestAnimationFrame(() => (el.style.opacity = '1'));
    },
    { title, subtitle },
  );
  await page.waitForTimeout(durationMs);
  await page.evaluate(() => {
    const el = document.getElementById('__demo_title_card__');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }
  });
  await page.waitForTimeout(550);
}

// ---------- caption banner (top of page) ----------

export async function caption(page, text, sub = '') {
  await page.evaluate(
    ({ text, sub }) => {
      const id = '__demo_caption__';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = `
          position: fixed;
          top: 24px; left: 50%; transform: translateX(-50%);
          max-width: 92%;
          padding: 14px 26px;
          background: rgba(15, 23, 42, 0.94);
          color: white;
          font-family: 'Lexend', system-ui, sans-serif;
          font-weight: 500;
          font-size: 16px;
          letter-spacing: 0.005em;
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          z-index: 99999;
          text-align: center; line-height: 1.4;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          pointer-events: none;
          opacity: 0;
          transition: opacity 280ms ease;
        `;
        document.body.appendChild(el);
      }
      el.innerHTML = sub
        ? `<div>${text}</div>
           <div style="font-size:13px;opacity:.65;margin-top:5px;font-weight:400">${sub}</div>`
        : `<div>${text}</div>`;
      requestAnimationFrame(() => (el.style.opacity = '1'));
    },
    { text, sub },
  );
}

export async function clearCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById('__demo_caption__');
    if (el) el.style.opacity = '0';
  });
}

// ---------- step badge (top-right) ----------

export async function stepBadge(page, current, total, label) {
  await page.evaluate(
    ({ current, total, label }) => {
      const id = '__demo_step__';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = `
          position: fixed;
          top: 24px; right: 24px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.94);
          color: hsl(222 47% 11%);
          font-family: 'Lexend', system-ui, sans-serif;
          font-weight: 600;
          font-size: 12px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          z-index: 99998;
          backdrop-filter: blur(10px);
          pointer-events: none;
          letter-spacing: 0.04em;
        `;
        document.body.appendChild(el);
      }
      el.innerHTML = `
        <span style="color: hsl(221 83% 53%);">${String(current).padStart(2, '0')}</span>
        <span style="opacity: 0.4">/${String(total).padStart(2, '0')}</span>
        <span style="margin-left: 8px; font-weight: 500; text-transform: uppercase">${label}</span>
      `;
    },
    { current, total, label },
  );
}

// ---------- spotlight (dim everything except target) ----------

export async function spotlight(page, selector, padding = 14) {
  return page.evaluate(
    ({ selector, padding }) => {
      const id = '__demo_spotlight__';
      const old = document.getElementById(id);
      if (old) old.remove();

      const el = document.querySelector(selector);
      if (!el) return false;
      const r = el.getBoundingClientRect();

      const div = document.createElement('div');
      div.id = id;
      div.style.cssText = `
        position: fixed;
        top: ${r.top - padding}px;
        left: ${r.left - padding}px;
        width: ${r.width + padding * 2}px;
        height: ${r.height + padding * 2}px;
        box-shadow: 0 0 0 9999px rgba(8, 12, 24, 0.66);
        border-radius: 12px;
        z-index: 99996;
        pointer-events: none;
        transition: opacity 320ms ease, top 320ms ease, left 320ms ease,
                    width 320ms ease, height 320ms ease;
        opacity: 0;
        outline: 2px solid rgba(96, 165, 250, 0.55);
      `;
      document.body.appendChild(div);
      requestAnimationFrame(() => (div.style.opacity = '1'));
      return true;
    },
    { selector, padding },
  );
}

export async function clearSpotlight(page) {
  await page.evaluate(() => {
    const el = document.getElementById('__demo_spotlight__');
    if (el) {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 350);
    }
  });
}

// ---------- zoom-in (clone, scale, drop shadow) ----------

export async function zoomIn(page, selector, scale = 1.4) {
  return page.evaluate(
    ({ selector, scale }) => {
      const id = '__demo_zoom__';
      const old = document.getElementById(id);
      if (old) old.remove();

      const el = document.querySelector(selector);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const clone = el.cloneNode(true);
      clone.id = id;
      clone.style.cssText = `
        position: fixed;
        top: ${r.top}px;
        left: ${r.left}px;
        width: ${r.width}px;
        height: ${r.height}px;
        z-index: 99997;
        transform-origin: center center;
        transform: scale(1);
        transition: transform 600ms cubic-bezier(0.34, 1.3, 0.4, 1),
                    box-shadow 600ms ease;
        border-radius: 10px;
        background: white;
        pointer-events: none;
      `;
      // Make sure the clone has the original's computed styles for child contents
      clone.style.padding = window.getComputedStyle(el).padding;
      document.body.appendChild(clone);

      requestAnimationFrame(() => {
        clone.style.transform = `scale(${scale})`;
        clone.style.boxShadow =
          '0 32px 80px rgba(0, 0, 0, 0.45), 0 0 0 4px hsl(221 83% 53% / 0.4)';
      });
      return true;
    },
    { selector, scale },
  );
}

export async function clearZoom(page) {
  await page.evaluate(() => {
    const el = document.getElementById('__demo_zoom__');
    if (el) {
      el.style.transform = 'scale(1)';
      el.style.boxShadow = 'none';
      setTimeout(() => el.remove(), 450);
    }
  });
}

// ---------- zoom into the latest Telegram bubble ----------

/**
 * Zoom-in on the *most recent* Telegram message bubble. Smarter than
 * `zoomIn(page, '.bubble:last-of-type', ...)` because Telegram WebK
 * sometimes wraps the last item in a service block — we walk back
 * until we find a bubble with text content.
 */
export async function zoomLastBubble(page, scale = 1.35) {
  return page.evaluate(
    ({ scale }) => {
      const id = '__demo_zoom__';
      const old = document.getElementById(id);
      if (old) old.remove();

      const bubbles = Array.from(document.querySelectorAll('.bubble'));
      let target = null;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const text = b.innerText?.trim() ?? '';
        if (text.length > 4) {
          target = b;
          break;
        }
      }
      if (!target) return false;
      const r = target.getBoundingClientRect();
      const clone = target.cloneNode(true);
      clone.id = id;
      clone.style.cssText = `
        position: fixed;
        top: ${r.top}px;
        left: ${r.left}px;
        width: ${r.width}px;
        z-index: 99997;
        transform-origin: ${r.left + r.width / 2}px ${r.top + r.height / 2}px;
        transform: scale(1);
        transition: transform 600ms cubic-bezier(0.34, 1.3, 0.4, 1),
                    box-shadow 600ms ease;
        border-radius: 14px;
        pointer-events: none;
      `;
      document.body.appendChild(clone);
      requestAnimationFrame(() => {
        clone.style.transform = `scale(${scale})`;
        clone.style.boxShadow =
          '0 32px 80px rgba(0, 0, 0, 0.5), 0 0 0 4px hsl(221 83% 53% / 0.5)';
      });
      return true;
    },
    { scale },
  );
}

// ---------- cross-fade between scenes ----------

export async function crossFade(page, fn) {
  await page.evaluate(() => {
    document.body.style.transition = 'opacity 280ms ease';
    document.body.style.opacity = '0';
  });
  await page.waitForTimeout(320);
  await fn();
  await page.evaluate(() => {
    document.body.style.opacity = '1';
  });
  await page.waitForTimeout(320);
}

// ---------- next.js dev toast hider ----------

export const HIDE_NEXT_DEV_CSS = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-build-error],
  [data-nextjs-static-indicator-toast],
  #__next-build-watcher,
  #__next-route-announcer__ {
    display: none !important; visibility: hidden !important;
  }
`;

export async function injectInitScripts(context) {
  await context.addInitScript(({ css }) => {
    const inject = () => {
      if (document.getElementById('__demo_hide_nextjs__')) return;
      const s = document.createElement('style');
      s.id = '__demo_hide_nextjs__';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  }, { css: HIDE_NEXT_DEV_CSS });
}

// ---------- natural typing ----------

export async function typeNatural(locator, text, base = 35, jitter = 35) {
  await locator.click();
  for (const ch of text) {
    await locator.type(ch, { delay: base + Math.random() * jitter });
  }
}
