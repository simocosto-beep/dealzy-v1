(() => {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
    .dz-ai-fab{position:fixed;left:12px;bottom:88px;z-index:61;border:0;border-radius:999px;padding:12px 16px;background:#172b59;color:#fff;font-weight:800;box-shadow:0 12px 30px rgba(23,43,89,.27);cursor:pointer}
    .dz-ai-wrap{position:fixed;inset:0;z-index:150;background:rgba(17,24,39,.5);display:none;align-items:flex-end;justify-content:center}
    .dz-ai-wrap.open{display:flex}
    .dz-ai-panel{width:min(640px,100%);height:min(700px,88dvh);min-height:390px;background:#fff;border-radius:26px 26px 0 0;display:flex;flex-direction:column;box-shadow:0 -18px 50px rgba(0,0,0,.2);overflow:hidden}
    .dz-ai-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid #e7e9f0}
    .dz-ai-head strong{display:block;font-size:19px}.dz-ai-head small{color:#667085}
    .dz-ai-close{border:0;background:#f2f4f7;border-radius:50%;width:40px;height:40px;font-size:22px;cursor:pointer}
    .dz-ai-notice{font-size:11px;line-height:1.4;background:#f5f6fb;color:#475467;padding:9px 18px}
    .dz-ai-messages{padding:16px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}
    .dz-ai-bubble{max-width:88%;border-radius:18px;padding:11px 14px;line-height:1.48;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}
    .dz-ai-bubble.assistant{align-self:flex-start;background:#f1f2fb;color:#172b59}
    .dz-ai-bubble.user{align-self:flex-end;background:#5145cd;color:#fff}
    .dz-ai-offers{align-self:flex-start;display:grid;gap:8px;width:min(100%,490px)}
    .dz-ai-offer{border:1px solid #e4e7ec;border-radius:14px;padding:10px 12px;color:#172b59;text-decoration:none;background:#fff;display:block}
    .dz-ai-offer b{display:block;font-size:13px}.dz-ai-offer span{display:block;color:#667085;font-size:12px;margin-top:4px}
    .dz-ai-offer[href]:focus-visible,.dz-ai-fab:focus-visible,.dz-ai-close:focus-visible{outline:3px solid #6d5dfc;outline-offset:2px}
    .dz-ai-suggestions{display:flex;gap:7px;overflow:auto;padding:0 16px 10px}
    .dz-ai-suggestions button,.dz-ai-guided{border:1px solid #dddafc;background:#f5f4ff;color:#5145cd;border-radius:999px;padding:8px 11px;font-size:12px;white-space:nowrap;cursor:pointer}
    .dz-ai-form{display:flex;align-items:flex-end;gap:9px;padding:11px 16px calc(11px + env(safe-area-inset-bottom));border-top:1px solid #e7e9f0}
    .dz-ai-input{flex:1;resize:none;min-height:42px;max-height:100px;border:1px solid #d0d5dd;border-radius:14px;padding:10px 12px;font:inherit;font-size:14px}
    .dz-ai-send{border:0;background:#5145cd;color:white;border-radius:14px;padding:10px 15px;min-height:42px;font-weight:800;cursor:pointer}
    .dz-ai-send:disabled,.dz-ai-input:disabled{opacity:.55;cursor:not-allowed}
    @media(max-width:360px){.dz-ai-fab{padding:12px}.dz-ai-panel{height:92dvh}}
  `;
  document.head.appendChild(css);

  const labels = {
    fr: {
      title:'Assistant Dealzy', subtitle:'Offres et voyages, en conversation', button:'✦ Assistant IA',
      close:'Fermer l’assistant', notice:'Vos messages sont envoyés à Google Gemini (offre gratuite). Ne partagez pas de données sensibles. Aucune position GPS précise ni donnée de compte n’est transmise.',
      welcome:'Bonjour ! Dites-moi ce que vous cherchez. Je comparerai les offres en direct disponibles dans votre ville.',
      checking:'Connexion à l’assistant…', unavailable:'La conversation IA n’est pas encore activée. Vous pouvez utiliser la recherche guidée de Dealzy.',
      quota:'Le quota gratuit est temporairement atteint. Réessayez plus tard.', error:'Je ne peux pas répondre pour le moment. Réessayez dans un instant.',
      placeholder:'Ex. Un spa à moins de 80 $', send:'Envoyer', guided:'Ouvrir la recherche guidée', offer:'Voir chez le partenaire',
      privacy:'Confidentialité', suggestions:['Restaurant à moins de 80 $','Un spa ce week-end','Activités près de moi']
    },
    en: {
      title:'Dealzy Assistant', subtitle:'Deals and travel, in conversation', button:'✦ AI Assistant',
      close:'Close assistant', notice:'Your messages are sent to Google Gemini (free tier). Do not share sensitive information. Precise GPS and account data are not sent.',
      welcome:'Hi! Tell me what you are looking for. I will compare live offers available in your city.',
      checking:'Connecting to the assistant…', unavailable:'AI chat is not enabled yet. You can still use Dealzy’s guided search.',
      quota:'The free quota is temporarily exhausted. Please try later.', error:'I cannot answer right now. Please try again shortly.',
      placeholder:'E.g. a spa under $80', send:'Send', guided:'Open guided search', offer:'See at partner',
      privacy:'Privacy', suggestions:['Dinner under $80','A spa this weekend','Activities near me']
    }
  };
  const locale = () => window.DealzyI18n?.getLocale() === 'fr' ? 'fr' : 'en';
  const say = key => labels[locale()][key];
  const market = () => {
    try {
      const value = JSON.parse(localStorage.getItem('dealzyMarket') || 'null') || {};
      return { country: value.country === 'CA' ? 'CA' : 'US', city: String(value.city || (value.country === 'CA' ? 'Toronto' : 'Miami')).slice(0, 80) };
    } catch (_) { return { country:'US', city:'Miami' }; }
  };

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'dz-ai-fab';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-expanded', 'false');
  document.body.appendChild(fab);
  const wrap = document.createElement('div');
  wrap.className = 'dz-ai-wrap';
  wrap.innerHTML = `<section class="dz-ai-panel" role="dialog" aria-modal="true" aria-labelledby="dzAiTitle">
    <div class="dz-ai-head"><div><strong id="dzAiTitle"></strong><small class="dz-ai-subtitle"></small></div><button type="button" class="dz-ai-close">×</button></div>
    <div class="dz-ai-notice"></div><div class="dz-ai-messages" role="log" aria-live="polite"></div>
    <div class="dz-ai-suggestions"></div><form class="dz-ai-form"><textarea class="dz-ai-input" rows="1" maxlength="500" required></textarea><button class="dz-ai-send" type="submit"></button></form>
  </section>`;
  document.body.appendChild(wrap);
  const $ = selector => wrap.querySelector(selector);
  const messages = $('.dz-ai-messages');
  const input = $('.dz-ai-input');
  const sendButton = $('.dz-ai-send');
  const history = [];
  let ready = false;
  let pending = false;
  let previousFocus = null;

  function addMessage(text, who) {
    const bubble = document.createElement('div');
    bubble.className = 'dz-ai-bubble ' + who;
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  function drawOffers(offers) {
    if (!Array.isArray(offers) || !offers.length) return;
    const list = document.createElement('div');
    list.className = 'dz-ai-offers';
    for (const offer of offers) {
      const card = document.createElement(offer.url ? 'a' : 'div');
      card.className = 'dz-ai-offer';
      if (offer.url) {
        try {
          const url = new URL(offer.url);
          if (url.protocol === 'https:') {
            card.href = url.href;
            card.target = '_blank';
            card.rel = 'noopener noreferrer sponsored';
          }
        } catch (_) {}
      }
      const title = document.createElement('b');
      title.textContent = offer.title || '';
      const meta = document.createElement('span');
      const price = Number(offer.price) > 0 ? new Intl.NumberFormat(locale() === 'fr' ? 'fr-CA' : 'en-US', { style:'currency', currency:offer.currency === 'CAD' ? 'CAD' : 'USD' }).format(offer.price) : '';
      meta.textContent = [offer.source, offer.place, price].filter(Boolean).join(' · ');
      card.append(title, meta);
      if (card.href) {
        const action = document.createElement('span');
        action.textContent = say('offer') + ' ↗';
        card.appendChild(action);
      }
      list.appendChild(card);
    }
    messages.appendChild(list);
    messages.scrollTop = messages.scrollHeight;
  }

  function updateLocale() {
    fab.textContent = say('button');
    $('#dzAiTitle').textContent = say('title');
    $('.dz-ai-subtitle').textContent = say('subtitle');
    $('.dz-ai-close').setAttribute('aria-label', say('close'));
    const notice = $('.dz-ai-notice');
    notice.textContent = say('notice') + ' ';
    const privacy = document.createElement('a');
    privacy.href = '/privacy.html';
    privacy.textContent = say('privacy');
    notice.appendChild(privacy);
    input.placeholder = say('placeholder');
    sendButton.textContent = say('send');
    const suggestions = $('.dz-ai-suggestions');
    suggestions.replaceChildren();
    for (const suggestion of say('suggestions')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = suggestion;
      button.onclick = () => { input.value = suggestion; input.focus(); };
      suggestions.appendChild(button);
    }
  }

  function guidedSearch() {
    close();
    const query = document.getElementById('aiQuery');
    if (query) query.value = input.value || say('suggestions')[0];
    if (typeof window.DealzyGuidedSearch === 'function') window.DealzyGuidedSearch(query?.value || '');
    else document.getElementById('askBtn')?.click();
  }

  async function checkAvailability() {
    const status = addMessage(say('checking'), 'assistant');
    try {
      const response = await fetch('/api/assistant', { cache:'no-store', signal:AbortSignal.timeout(5000) });
      const data = await response.json();
      ready = response.ok && data.available === true;
    } catch (_) { ready = false; }
    status.textContent = ready ? say('welcome') : say('unavailable');
    input.disabled = sendButton.disabled = !ready;
    if (!ready && !$('.dz-ai-guided')) {
      const button = document.createElement('button');
      button.className = 'dz-ai-guided';
      button.type = 'button';
      button.textContent = say('guided');
      button.onclick = guidedSearch;
      messages.appendChild(button);
    }
    if (ready) input.focus();
  }

  function open() {
    if (wrap.classList.contains('open')) return;
    previousFocus = document.activeElement;
    updateLocale();
    wrap.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    $('.dz-ai-close').focus();
    if (!messages.children.length) checkAvailability();
    else if (ready) input.focus();
  }

  function close() {
    wrap.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    previousFocus?.focus?.();
  }

  async function send() {
    const message = input.value.trim();
    if (!ready || pending || !message) return;
    pending = true;
    input.value = '';
    sendButton.disabled = true;
    addMessage(message, 'user');
    const responseBubble = addMessage('…', 'assistant');
    try {
      const { city, country } = market();
      const response = await fetch('/api/assistant', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ message, history:history.slice(-4), city, country, locale:locale() }),
        signal:AbortSignal.timeout(25000)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? 'quota' : data.error || 'error');
      responseBubble.textContent = data.reply;
      drawOffers(data.offers);
      history.push({ role:'user', text:message }, { role:'assistant', text:data.reply });
      if (history.length > 8) history.splice(0, history.length - 8);
    } catch (error) {
      responseBubble.textContent = error.message === 'quota' ? say('quota') : say('error');
    } finally {
      pending = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  fab.onclick = open;
  $('.dz-ai-close').onclick = close;
  wrap.onclick = event => { if (event.target === wrap) close(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && wrap.classList.contains('open')) close(); });
  $('.dz-ai-form').onsubmit = event => { event.preventDefault(); send(); };
  input.onkeydown = event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  };
  document.addEventListener('dealzy:localechange', updateLocale);
  updateLocale();
  window.DealzyAssistant = { open };
})();
