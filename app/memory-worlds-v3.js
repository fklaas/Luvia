(() => {
    'use strict';
    const BUILD = '13.34.1', VERSION = '4.34.1';
    let host = null, stopAlbums = null, stopJourneys = null;
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const plain = (html = '') => { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    const me = () => window.ParisAuth?.getState?.()?.user || {};
    const dayKey = (m) => m.dayKey || m.day_key || String(m.capturedAt || m.createdAt || '').slice(0, 10) || 'undatiert';
    const fmt = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? 'Reisetag' : new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }).format(d); };
    const shortDate = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long' }).format(d); };
    const REACTIONS = ['❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🤍', '🥹', '🥰', '😍', '😂', '🤣', '😊', '😌', '🤩', '🥳', '🤯', '🙈', '🫶', '✨', '⭐', '🌙', '☀️', '🌈', '🔥', '🎉', '🎶', '📸', '✈️', '🚆', '🚗', '🚲', '🛳️', '🏖️', '🏔️', '🏙️', '🎡', '🎢', '🌊', '🌸', '🌿', '🍝', '🍕', '🥐', '☕', '🍷', '🍰', '🍦', '🍓', '👨‍👩‍👧', '👶', '🐾', '💫', '😎', '🤭', '😋', '🥲', '🤪', '🙃', '🫠', '💯'];
    const MQ = ['Was ist das Erste, das dir bei diesem Moment wieder einfällt?', 'Was sieht man auf den Bildern nicht, gehört aber unbedingt dazu?', 'Was habt ihr in diesem Augenblick gehört, gerochen oder geschmeckt?', 'Welcher Satz ist aus diesem Moment hängen geblieben?', 'Was würdest du genau daran in zehn Jahren noch wissen wollen?'];
    const JQ = ['Welche Begegnung gehört für dich zu dieser Reise?', 'Welcher Geschmack bringt dich sofort zurück?', 'Was war schöner als vorher geplant?', 'Welcher kleine Umweg ist dir geblieben?', 'Welche Stimmung fehlt auf den Fotos?', 'Welcher Augenblick war für dich am meisten „wir“?'];
    const TONES = { natural: 'Natürlich', warm: 'Wärmer', funny: 'Lockerer', cheeky: 'Frecher', romantic: 'Romantischer', cinematic: 'Bildhafter', nostalgic: 'Nostalgischer', short: 'Kürzer', long: 'Ausführlicher' };
    const signedCache = new Map();
    async function signed(m) { if (!m)
        return ''; const k = String(m.id); if (signedCache.has(k))
        return signedCache.get(k); const u = await window.LuviaMediaCore?.signedUrl?.(m, 3600).catch(() => null) || ''; signedCache.set(k, u); return u; }
    async function img(el, m) { if (!el || !m)
        return; const u = await signed(m); if (u && el.isConnected)
        el.style.backgroundImage = `url("${u.replace(/"/g, '%22')}")`; }
    function toast(msg) { window.LuviaToast?.show?.(msg) || console.info('[Memory]', msg); }
    function source() { return window.LuviaMemoryJourneys.source(); }
    function destination() { const t = window.LuviaTripStore?.snapshot?.().activeTrip || {}; return t.destination?.name || t.destinationName || t.location || t.title || 'eure Reise'; }
    function placeOf(media) { for (const m of media || []) {
        const l = m.metadata?.resolvedLocation;
        if (l?.name)
            return l.name;
        if (l?.address)
            return l.address;
    } return ''; }
    function factsOf(media) { return (media || []).slice(0, 8).map(m => ({ capturedAt: m.capturedAt || m.createdAt || null, location: m.metadata?.resolvedLocation || null, exif: m.metadata?.exif || null, existingAnalysis: m.metadata?.aiAnalysis || m.metadata?.vision || m.metadata?.caption || null })); }
    class AIComposer {
        constructor() {
            this.cache = new Map();
            this.inflight = new Map();
            this.blockedUntil = 0;
        }
        key(ctx) { return JSON.stringify({ scope: ctx.scope, destination: ctx.destination, place: ctx.place, date: ctx.date, facts: ctx.facts, voices: ctx.voices, sensory: ctx.sensory, existing: ctx.existing }).slice(0, 20000); }
        fallback(ctx) { const place = ctx.place || ctx.destination || '', date = ctx.date ? shortDate(ctx.date) : '', count = ctx.photoCount || ctx.facts?.length || 0; const titles = []; if (place && date) {
            titles.push(`${place}, ${date}`, `${date} in ${place}`);
        } if (place)
            titles.push(`Kurz in ${place}`, `${place}, ganz ohne Plan`, `Ein Stück ${place}`); if (date)
            titles.push(`Unser ${date}`); titles.push('Ein Moment, der geblieben ist', 'Genau dieser Augenblick', 'Davon erzählen die Bilder'); const details = [date && `Am ${date}`, place && `in ${place}`, count && `entstanden ${count} Bilder`].filter(Boolean); let story = details.length ? details.join(' ') + '.' : ''; const voice = (ctx.voices || []).filter(Boolean).join(' '); if (voice)
            story += (story ? ' ' : '') + voice;
        else if (ctx.existing)
            story += (story ? ' ' : '') + plain(ctx.existing); if (!story)
            story = 'Ein paar Bilder halten diesen Abschnitt der Reise fest. Ihr könnt ergänzen, was auf ihnen nicht zu sehen ist.'; return { titles: [...new Set(titles)].slice(0, 8), story, shortCaption: titles[0] || 'Unsere Erinnerung', highlights: [], evidenceUsed: [], fallback: true }; }
        async compose(ctx, force = false) { const k = this.key(ctx); if (!force && this.cache.has(k))
            return this.cache.get(k); if (this.inflight.has(k))
            return this.inflight.get(k); const task = (async () => { if (Date.now() < this.blockedUntil)
            return this.fallback(ctx); const p = window.LuviaOpenAIProvider; if (!p?.run)
            return this.fallback(ctx); const imageUrls = []; for (const m of (ctx.media || []).slice(0, 3)) {
            const u = await signed(m);
            if (u)
                imageUrls.push(u);
        } try {
            const r = await p.run({ capability: 'memory.compose', tier: 'default', input: { language: 'de', scope: ctx.scope, destination: ctx.destination || '', place: ctx.place || '', date: ctx.date || '', photoCount: ctx.photoCount || 0, facts: ctx.facts || [], travelerStatements: ctx.voices || [], sensory: ctx.sensory || {}, existingText: plain(ctx.existing || ''), tone: ctx.tone || 'natürlich, konkret und unaufgesetzt', imageUrls }, context: { trip: window.LuviaTripStore?.snapshot?.().activeTrip || null } }, { timeoutMs: 55000 });
            const d = r?.data?.result || r?.result || r?.data || {};
            const out = { titles: (d.titles || []).filter(Boolean), story: String(d.story || ''), shortCaption: String(d.shortCaption || ''), highlights: d.highlights || [], evidenceUsed: d.evidenceUsed || [], fallback: false };
            if (!out.titles.length || !out.story)
                throw new Error('KI-Antwort war unvollständig.');
            this.cache.set(k, out);
            return out;
        }
        catch (e) {
            const status = Number(e?.cause?.context?.status || e?.status || 0);
            if (status === 429 || /429|rate/i.test(String(e?.message || '')))
                this.blockedUntil = Date.now() + 30000;
            console.warn('[MemoryAI] using grounded local fallback', e);
            return this.fallback(ctx);
        } })().finally(() => this.inflight.delete(k)); this.inflight.set(k, task); return task; }
    }
    const ai = new AIComposer();
    function editor(id, value = '', placeholder = 'Schreibt, was euch geblieben ist …') { return `<div class="mw-editor" data-editor="${id}"><div class="mw-editor-body" contenteditable="true" data-body="${id}" data-placeholder="${esc(placeholder)}">${value || ''}</div><div class="mw-editor-bar"><button data-cmd="bold"><b>B</b></button><button data-cmd="italic"><i>I</i></button><button data-cmd="underline"><u>U</u></button><button data-cmd="insertUnorderedList">• Liste</button><button data-emoji>☺</button></div><div class="mw-emoji">${REACTIONS.map(x => `<button data-insert="${x}">${x}</button>`).join('')}</div></div>`; }
    function bindEditor(root, id, cb) { const w = root.querySelector(`[data-editor="${id}"]`); if (!w)
        return; const b = w.querySelector(`[data-body="${id}"]`); b.oninput = () => cb(b.innerHTML); w.querySelectorAll('[data-cmd]').forEach((x) => x.onclick = () => { document.execCommand(x.dataset.cmd, false); b.focus(); cb(b.innerHTML); }); w.querySelector('[data-emoji]').onclick = () => w.classList.toggle('emoji-open'); w.querySelectorAll('[data-insert]').forEach((x) => x.onclick = () => { b.focus(); document.execCommand('insertText', false, x.dataset.insert); cb(b.innerHTML); }); }
    function aiBtn(label, kind = 'compose') { return `<button class="mw-ai" data-ai="${kind}"><span>✦</span>${esc(label)}</button>`; }
    function next(label) { return `<button class="mw-next" data-next><span>${esc(label)}</span><b>→</b></button>`; }
    function toneButtons() { return `<div class="mw-tones">${Object.entries(TONES).map(([k, v]) => `<button data-tone="${k}">${esc(v)}</button>`).join('')}</div>`; }
    function voices(members, contrib = []) { const map = new Map(contrib.map(c => [String(c.user_id), c])); return `<div class="mw-voices">${members.map(m => { const c = map.get(String(m.id)); return `<div class="mw-voice ${c ? 'has' : ''}"><b>${esc((m.displayName || '?').slice(0, 1))}</b><span>${esc(m.displayName || 'Reisender')}</span><small>${c ? esc(c.reaction || '✓') : 'wartet noch'}</small></div>`; }).join('')}</div>`; }
    function shell(kind) { const root = document.createElement('div'); root.className = `mw-shell ${kind}`; root.innerHTML = `<div class="mw-stage"><div class="mw-render"></div><div class="mw-ui"></div><button class="mw-close" aria-label="Schließen">×</button><div class="mw-progress"></div></div>`; document.body.append(root); document.body.classList.add('mw-open'); const render = root.querySelector('.mw-render'), ui = root.querySelector('.mw-ui'); const engine = window.LuviaMemoryRenderEngine.create(render); const close = () => { root.classList.add('closing'); setTimeout(() => { engine.destroy(); root.remove(); document.body.classList.remove('mw-open'); }, 420); }; root.querySelector('.mw-close').onclick = close; return { root, ui, engine, close }; }
    function setProgress(root, i, n) { root.querySelector('.mw-progress').innerHTML = Array.from({ length: n }, (_, x) => `<i class="${x === i ? 'on' : x < i ? 'done' : ''}"></i>`).join(''); }
    function renderUI(ui, html, cls = '') { ui.className = `mw-ui ${cls} switching`; ui.innerHTML = html; void ui.offsetWidth; requestAnimationFrame(() => requestAnimationFrame(() => ui.classList.remove('switching'))); }
    async function aiFill(btn, ctx, onResult, force = false) { btn.disabled = true; btn.classList.add('loading'); const old = btn.innerHTML; btn.innerHTML = '<span>✦</span> Luvia denkt …'; try {
        const r = await ai.compose(ctx, force);
        onResult(r);
        if (r.fallback)
            toast('KI war gerade ausgelastet – Luvia zeigt einen sachlichen lokalen Vorschlag.');
    }
    finally {
        if (btn.isConnected) {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = old;
        }
    } }
    function cycleWeight(current) { return current >= 3 ? 1 : current + 1; }
    function weightName(n) { return n === 3 ? 'Herzstück' : n === 2 ? 'Wichtig' : 'Nebenrolle'; }
    async function renderHome() { if (!host)
        return; const [src, albums, journeys] = await Promise.all([source(), window.LuviaMemoryAlbums.list(), window.LuviaMemoryJourneys.list()]); const dest = destination(); host.innerHTML = `<div class="mw-home"><section><small>LUVIA MEMORIES</small><h1>Nicht ablegen.<br><em>Noch einmal erleben.</em></h1><p>Moments sind kurze Szenen. Journeys werden zu einem gemeinsamen Reisefilm, an dem alle Reisenden mitbauen.</p></section><div class="mw-home-choices"><button data-moment><b>Memory Moment</b><span>Ein Augenblick · nah · persönlich</span><i>${src.clusters.length}</i></button><button data-journey><b>Memory Journey</b><span>${esc(dest)} · die ganze Geschichte</span><i>${src.days.length}</i></button></div><div class="mw-saved">${journeys.map((j) => `<button data-open-j="${j.id}"><small>Journey</small><b>${esc(j.title || dest)}</b></button>`).join('')}${albums.map((a) => `<button data-open-m="${esc(a.source_cluster_id || '')}"><small>Moment</small><b>${esc(a.title || 'Erinnerung')}</b></button>`).join('')}</div></div>`; host.querySelector('[data-moment]').onclick = () => pickMoment(src.clusters); host.querySelector('[data-journey]').onclick = async () => openJourney(null, src, await window.LuviaMemoryAlbums.listMembers()); host.querySelectorAll('[data-open-m]').forEach((b) => b.onclick = async () => { const c = src.clusters.find((x) => String(x.id) === String(b.dataset.openM)); if (c)
        openMoment(c, await window.LuviaMemoryAlbums.listMembers()); }); host.querySelectorAll('[data-open-j]').forEach((b) => b.onclick = async () => openJourney(journeys.find((x) => String(x.id) === String(b.dataset.openJ)), src, await window.LuviaMemoryAlbums.listMembers())); }
    async function pickMoment(clusters) { const { root, ui, engine, close } = shell('moment-picker'); engine.setScene('studio'); renderUI(ui, `<div class="mw-picker-copy"><small>MEMORY MOMENT</small><h1>Welcher Augenblick<br>soll noch einmal aufgehen?</h1></div><div class="mw-picker-grid">${clusters.map((c, i) => `<button data-c="${c.id}"><figure data-img="${i}"></figure><span>${esc(c.title || 'Euer Moment')}</span><small>${c.mediaIds.length} Bilder</small></button>`).join('')}</div>`, 'picker'); for (let i = 0; i < clusters.length; i++) {
        const m = (await window.LuviaMemoryAlbums.mediaByIds([clusters[i].mediaIds[0]]))[0];
        img(ui.querySelector(`[data-img="${i}"]`), m);
    } ui.querySelectorAll('[data-c]').forEach((b) => b.onclick = async () => { const c = clusters.find(x => String(x.id) === String(b.dataset.c)); close(); setTimeout(async () => openMoment(c, await window.LuviaMemoryAlbums.listMembers()), 450); }); }
    async function openMoment(cluster, members) {
        const media = await window.LuviaMemoryAlbums.mediaByIds(cluster.mediaIds), existing = await window.LuviaMemoryAlbums.getByCluster(cluster.id), mine = existing?.contributions?.find((c) => String(c.user_id) === String(me().id)), weights = { ...(existing?.metadata?.weights?.media || {}) };
        media.forEach((m) => { var _a; return weights[_a = String(m.id)] ?? (weights[_a] = m.favorite ? 3 : 2); });
        const state = { i: 0, id: existing?.id || null, title: existing?.title || cluster.title || '', story: existing?.metadata?.richStory || existing?.description || '', cover: existing?.cover_media_id || media[0]?.id, answer: mine?.metadata?.richText || mine?.answer_text || '', reaction: mine?.reaction || '', question: mine?.prompt_text || MQ[0], weights, sensory: { food: existing?.metadata?.sensory?.food || '', people: existing?.metadata?.sensory?.people || '', weather: existing?.metadata?.sensory?.weather || '' } };
        const place = placeOf(media), dest = destination();
        const { root, ui, engine, close } = shell('moment');
        const N = 6;
        async function save(status = 'draft') { const r = await window.LuviaMemoryAlbums.save({ id: state.id, clusterId: cluster.id, title: state.title || cluster.title || 'Unser Moment', description: plain(state.story), mediaIds: media.map((m) => m.id), coverMediaId: state.cover, status, metadata: { richStory: state.story, weights: { media: state.weights }, sensory: state.sensory, experience: 'render-engine-v1' } }); state.id = r.id; if (plain(state.answer) || state.reaction)
            await window.LuviaMemoryAlbums.saveContribution(state.id, { promptKey: 'render-voice', promptText: state.question, answerText: plain(state.answer), reaction: state.reaction, metadata: { richText: state.answer } }); return r; }
        async function show() {
            setProgress(root, state.i, N);
            if (state.i === 0) {
                engine.setScene('moment');
                renderUI(ui, `<div class="mw-hero"><figure data-hero></figure><div class="mw-readable hero-copy"><small>${esc(fmt(media[0]?.capturedAt || media[0]?.createdAt))}</small><h1>Ein Augenblick,<br>noch einmal ganz nah.</h1><p>${esc(place || dest)} · ${media.length} Bilder</p>${next('In den Moment eintauchen')}</div></div>`, 'hero');
                img(ui.querySelector('[data-hero]'), media[0]);
            }
            else if (state.i === 1) {
                engine.setScene('cloud');
                renderUI(ui, `<div class="mw-cloud-card mw-readable"><small>EURE STIMME</small><h2>${esc(state.question)}</h2>${editor('mvoice', state.answer, 'Was gehört zu diesem Moment, obwohl es kein Foto davon gibt?')}<div class="mw-reactions">${REACTIONS.slice(0, 36).map(x => `<button class="${state.reaction === x ? 'on' : ''}" data-r="${x}">${x}</button>`).join('')}</div><button class="mw-question" data-q>↻ andere Frage</button></div>${next('Weiter')}`, 'cloud-card');
                bindEditor(ui, 'mvoice', v => state.answer = v);
                ui.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { state.reaction = b.dataset.r; show(); });
                ui.querySelector('[data-q]').onclick = () => { state.question = MQ[(MQ.indexOf(state.question) + 1) % MQ.length]; show(); };
            }
            else if (state.i === 2) {
                engine.setScene('dining');
                renderUI(ui, `<div class="mw-sensory"><div class="mw-menu mw-readable"><small>WAS DIE BILDER NICHT SPEICHERN</small><h2>Geschmack, Menschen, Atmosphäre.</h2><div class="mw-sensory-tabs"><button class="on" data-tab="food">Genuss</button><button data-tab="people">Menschen</button><button data-tab="weather">Atmosphäre</button></div><textarea data-sensory placeholder="z. B. der Kaffee, das Restaurant, ein Geruch …">${esc(state.sensory.food)}</textarea>${aiBtn('KI-Text aus Bildern & Kontext', 'sensory')}<p class="mw-ai-hint">KI nutzt nur vorhandene Bilder, Foto-Metadaten und eure bisherigen Aussagen.</p></div>${voices(members, existing?.contributions || [])}</div>${next('Zu euren Bildern')}`, 'sensory');
                let tab = 'food';
                const ta = ui.querySelector('[data-sensory]');
                const setTab = (k) => { tab = k; ui.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k)); ta.value = state.sensory[k] || ''; };
                ui.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
                ta.oninput = () => state.sensory[tab] = ta.value;
                ui.querySelector('[data-ai]').onclick = (e) => aiFill(e.currentTarget, { scope: `moment-${tab}`, destination: dest, place, date: media[0]?.capturedAt, photoCount: media.length, facts: factsOf(media), voices: [plain(state.answer)], sensory: state.sensory, existing: state.sensory[tab], media }, r => { state.sensory[tab] = r.story; ta.value = r.story; });
            }
            else if (state.i === 3) {
                engine.setScene('studio');
                renderUI(ui, `<div class="mw-cut"><div class="mw-readable cut-copy"><small>BILDSCHNITT</small><h2>Was trägt diesen Moment?</h2><p>Ein Tap wechselt zwischen Nebenrolle, Wichtig und Herzstück. Das beeinflusst Story, Reel und Film.</p></div><div class="mw-filmstrip">${media.map((m, i) => `<article class="${String(state.cover) === String(m.id) ? 'cover' : ''}" data-card="${m.id}"><figure data-m="${i}"></figure><button data-weight="${m.id}" class="w${state.weights[String(m.id)]}">${weightName(state.weights[String(m.id)])}</button><button data-cover="${m.id}">${String(state.cover) === String(m.id) ? '✓ Euer Cover' : 'Als Cover'}</button></article>`).join('')}</div></div>${next('Name & Geschichte')}`, 'cut');
                media.forEach((m, i) => img(ui.querySelector(`[data-m="${i}"]`), m));
                ui.querySelectorAll('[data-weight]').forEach((b) => b.onclick = () => { const id = b.dataset.weight, n = cycleWeight(Number(state.weights[id] || 2)); state.weights[id] = n; b.className = 'w' + n; b.textContent = weightName(n); });
                ui.querySelectorAll('[data-cover]').forEach((b) => b.onclick = () => { state.cover = b.dataset.cover; show(); });
            }
            else if (state.i === 4) {
                engine.setScene('city');
                const ctx = { scope: 'moment', destination: dest, place, date: media[0]?.capturedAt, photoCount: media.length, facts: factsOf(media), voices: [plain(state.answer)], sensory: state.sensory, existing: state.story, media };
                renderUI(ui, `<div class="mw-pass mw-readable"><small>MEMORY PASS · ${esc(place || dest)}</small><label>Dieser Moment heißt</label><input data-title value="${esc(state.title)}" placeholder="Ein natürlicher Titel"><div class="mw-ai-row">${aiBtn('Titelvorschläge', 'titles')}${aiBtn('Textvorschlag', 'story')}</div><div class="mw-title-picks"></div></div><div class="mw-story mw-readable"><small>EURE GESCHICHTE</small>${editor('mstory', state.story, 'Luvia kann einen ersten Entwurf schreiben. Ihr entscheidet, was stimmt.')} ${toneButtons()}</div>${next('Premiere')}`, 'pass');
                bindEditor(ui, 'mstory', v => state.story = v);
                const ti = ui.querySelector('[data-title]');
                ti.oninput = () => state.title = ti.value;
                const picks = ui.querySelector('.mw-title-picks');
                const showPicks = (arr) => { picks.innerHTML = arr.slice(0, 8).map(t => `<button>${esc(t)}</button>`).join(''); picks.querySelectorAll('button').forEach((b) => b.onclick = () => { state.title = b.textContent; ti.value = state.title; }); };
                ui.querySelectorAll('[data-ai]').forEach((b) => b.onclick = () => aiFill(b, ctx, r => { if (b.dataset.ai === 'titles')
                    showPicks(r.titles);
                else {
                    state.story = `<p>${esc(r.story)}</p>`;
                    show();
                } }));
                ui.querySelectorAll('[data-tone]').forEach((b) => b.onclick = () => aiFill(b, { ...ctx, tone: `Bitte den Text ${TONES[b.dataset.tone].toLowerCase()} formulieren.`, existing: state.story }, r => { state.story = `<p>${esc(r.story)}</p>`; show(); }, true));
            }
            else {
                engine.setScene('premiere');
                const sorted = [...media].sort((a, b) => (state.weights[String(b.id)] || 2) - (state.weights[String(a.id)] || 2));
                renderUI(ui, `<div class="mw-premiere"><div class="mw-premiere-images">${sorted.slice(0, 5).map((m, i) => `<figure class="${i === 0 ? 'on' : ''}" data-p="${i}"></figure>`).join('')}</div><div class="mw-readable premiere-copy"><small>MEMORY MOMENT</small><h1>${esc(state.title || cluster.title || 'Euer Moment')}</h1><p>${esc(plain(state.story).slice(0, 420))}</p></div>${voices(members, (await window.LuviaMemoryAlbums.getByCluster(cluster.id))?.contributions || [])}<div class="mw-export-dock"><button data-publish>Gemeinsam bewahren</button><button data-story>Story Set</button><button data-reel>Reel · MP4</button><button data-post>Post</button><button data-film>Luvia Film · MP4</button></div></div>`, 'premiere');
                sorted.slice(0, 5).forEach((m, i) => img(ui.querySelector(`[data-p="${i}"]`), m));
                const model = () => ({ title: state.title || cluster.title, story: state.story, media: sorted, weights: state.weights, cover: state.cover, voices: existing?.contributions || [], sensory: state.sensory, destination: dest });
                ui.querySelector('[data-story]').onclick = async () => { toast('Luvia baut ein 3-teiliges Story Set …'); await window.LuviaMemoryExportEngine.exportStory(model()); };
                ui.querySelector('[data-post]').onclick = () => window.LuviaMemoryExportEngine.exportPost(model());
                ui.querySelector('[data-reel]').onclick = async () => { try {
                    toast('Luvia rendert euer MP4-Reel …');
                    await window.LuviaMemoryExportEngine.exportReel(model());
                }
                catch (e) {
                    toast(e.message);
                } };
                ui.querySelector('[data-film]').onclick = async () => { try {
                    toast('Luvia rendert euren MP4-Film …');
                    await window.LuviaMemoryExportEngine.exportFilm(model());
                }
                catch (e) {
                    toast(e.message);
                } };
                ui.querySelector('[data-publish]').onclick = async () => { await save('published'); toast('Der Moment ist gemeinsam bewahrt.'); close(); renderHome(); };
            }
            const nb = ui.querySelector('[data-next]');
            if (nb)
                nb.onclick = async () => { if (state.i > 0)
                    await save('draft'); state.i = Math.min(N - 1, state.i + 1); show(); };
        }
        show();
    }
    async function openJourney(existing = null, src = null, members = null) {
        src = src || await source();
        members = members || await window.LuviaMemoryAlbums.listMembers();
        const fresh = existing?.id ? await window.LuviaMemoryJourneys.get(existing.id) : existing, dest = destination(), saved = fresh?.chapters || [], days = src.days.map((k) => { const ms = src.media.filter((m) => dayKey(m) === k), s = saved.find((x) => x.day_key === k); return { key: k, media: ms, title: s?.title || fmt(k), story: s?.metadata?.richSummary || s?.summary || '', cover: s?.cover_media_id || ms[0]?.id, weight: s?.metadata?.importance || 2 }; }), mine = fresh?.contributions?.find((c) => String(c.user_id) === String(me().id)), weights = { ...(fresh?.metadata?.weights?.media || {}) };
        src.media.forEach((m) => { var _a; return weights[_a = String(m.id)] ?? (weights[_a] = m.favorite ? 3 : 2); });
        const state = { i: 0, id: fresh?.id || null, title: fresh?.title || '', story: fresh?.metadata?.richStory || fresh?.description || '', cover: fresh?.cover_media_id || src.media[0]?.id, answer: mine?.metadata?.richText || mine?.answer_text || '', reaction: mine?.reaction || '', question: mine?.prompt_text || JQ[0], days, dayIndex: 0, momentIndex: 0, weights, sensory: { food: fresh?.metadata?.sensory?.food || '', people: fresh?.metadata?.sensory?.people || '', weather: fresh?.metadata?.sensory?.weather || '' } };
        const { root, ui, engine, close } = shell('journey'), N = 7;
        async function save(status = 'draft') { const r = await window.LuviaMemoryJourneys.save({ id: state.id, title: state.title || `Unsere Reise nach ${dest}`, description: plain(state.story), coverMediaId: state.cover, status, chapters: state.days.map((d, i) => ({ dayKey: d.key, position: i, title: d.title, summary: plain(d.story), coverMediaId: d.cover, metadata: { richSummary: d.story, importance: d.weight } })), items: src.media.map((m, i) => ({ itemType: 'media', sourceId: m.id, dayKey: dayKey(m), position: i, weight: state.weights[String(m.id)] || 2, metadata: { importance: state.weights[String(m.id)] || 2 } })), metadata: { richStory: state.story, weights: { media: state.weights }, sensory: state.sensory, experience: 'render-engine-v1' } }); state.id = r.id; if (plain(state.answer) || state.reaction)
            await window.LuviaMemoryJourneys.saveContribution(state.id, { promptKey: 'render-voice', promptText: state.question, answerText: plain(state.answer), reaction: state.reaction, metadata: { richText: state.answer } }); return r; }
        async function show() {
            setProgress(root, state.i, N);
            if (state.i === 0) {
                engine.setScene('flight');
                renderUI(ui, `<div class="mw-departure mw-readable"><small>MEMORY JOURNEY</small><h1>Zurück nach<br><em>${esc(dest)}</em></h1><p>${state.days.length} Reisetage · ${src.media.length} Bilder · ${members.length} Reisende</p><p class="mw-caption">Die Reise beginnt – und der Himmel bleibt in Bewegung.</p>${next('Reise starten')}</div>`, 'departure');
            }
            else if (state.i === 1) {
                engine.setScene('day');
                const d = state.days[state.dayIndex], ctx = { scope: 'journey-day', destination: dest, place: placeOf(d.media), date: d.key, photoCount: d.media.length, facts: factsOf(d.media), voices: [], sensory: state.sensory, existing: d.story, media: d.media };
                renderUI(ui, `<div class="mw-day-stage"><div class="mw-day-photo" data-dayphoto></div><div class="mw-day-ticket mw-readable"><small>REISETAG ${String(state.dayIndex + 1).padStart(2, '0')} · ${esc(fmt(d.key))}</small><input data-daytitle value="${esc(d.title)}"><div class="mw-ai-row">${aiBtn('KI: Titel + Text', 'day')}</div>${editor('daystory', d.story, 'Was ist von diesem Tag wirklich geblieben?')}<div class="mw-day-nav"><button data-prev ${state.dayIndex === 0 ? 'disabled' : ''}>← vorheriger Tag</button><span>${state.dayIndex + 1} / ${state.days.length}</span><button data-nextday ${state.dayIndex === state.days.length - 1 ? 'disabled' : ''}>nächster Tag →</button></div></div></div>${next('Durch eure Moments reisen')}`, 'day');
                img(ui.querySelector('[data-dayphoto]'), d.media[0]);
                bindEditor(ui, 'daystory', v => d.story = v);
                const title = ui.querySelector('[data-daytitle]');
                title.oninput = () => d.title = title.value;
                ui.querySelector('[data-prev]').onclick = () => { state.dayIndex--; show(); };
                ui.querySelector('[data-nextday]').onclick = () => { state.dayIndex++; show(); };
                ui.querySelector('[data-ai]').onclick = (e) => aiFill(e.currentTarget, ctx, r => { d.title = r.titles[0] || d.title; d.story = `<p>${esc(r.story)}</p>`; show(); });
            }
            else if (state.i === 2) {
                engine.setScene('city');
                const clusters = src.clusters || [], c = clusters[state.momentIndex] || clusters[0];
                const ms = c ? await window.LuviaMemoryAlbums.mediaByIds(c.mediaIds) : [];
                renderUI(ui, `<div class="mw-moment-theatre"><div class="mw-moment-stack">${ms.slice(0, 3).map((m, i) => `<figure data-cimg="${i}"></figure>`).join('')}</div><div class="mw-readable moment-copy"><small>${esc(fmt(ms[0]?.capturedAt || ms[0]?.createdAt))}</small><h2>${esc(c?.title || 'Euer Moment')}</h2><p>${esc(placeOf(ms) || dest)} · ${ms.length} Bilder</p><button data-openmoment>Moment noch einmal öffnen</button><div class="mw-day-nav"><button data-prevm ${state.momentIndex === 0 ? 'disabled' : ''}>←</button><span>${state.momentIndex + 1} / ${Math.max(1, clusters.length)}</span><button data-nextm ${state.momentIndex >= clusters.length - 1 ? 'disabled' : ''}>→</button></div></div></div>${next('An den Tisch')}`, 'moment-theatre');
                ms.slice(0, 3).forEach((m, i) => img(ui.querySelector(`[data-cimg="${i}"]`), m));
                if (ui.querySelector('[data-prevm]'))
                    ui.querySelector('[data-prevm]').onclick = () => { state.momentIndex--; show(); };
                if (ui.querySelector('[data-nextm]'))
                    ui.querySelector('[data-nextm]').onclick = () => { state.momentIndex++; show(); };
                if (c)
                    ui.querySelector('[data-openmoment]').onclick = async () => openMoment(c, members);
            }
            else if (state.i === 3) {
                engine.setScene('dining');
                const ctx = { scope: 'journey-sensory', destination: dest, place: '', date: '', photoCount: src.media.length, facts: factsOf(src.media), voices: [plain(state.answer)], sensory: state.sensory, existing: '', media: src.media };
                renderUI(ui, `<div class="mw-table-scene"><div class="mw-menu mw-readable"><small>AM TISCH</small><h2>Was gehört zur Reise, obwohl es kein Programmpunkt war?</h2><div class="mw-sensory-tabs"><button class="on" data-tab="food">Essen & Trinken</button><button data-tab="people">Menschen</button><button data-tab="weather">Wetter & Stimmung</button></div><textarea data-sensory placeholder="Schreibt nur, was wirklich da war …">${esc(state.sensory.food)}</textarea>${aiBtn('KI-Vorschlag aus Reisebildern', 'sensory')}<p class="mw-ai-hint">Ein KI-Aufruf liefert Titel und Text zusammen. Keine separaten Vision-Aufrufe mehr.</p></div>${voices(members, fresh?.contributions || [])}</div>${next('Zum Meer')}`, 'table');
                let tab = 'food';
                const ta = ui.querySelector('[data-sensory]');
                const setTab = (k) => { tab = k; ui.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k)); ta.value = state.sensory[k] || ''; };
                ui.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
                ta.oninput = () => state.sensory[tab] = ta.value;
                ui.querySelector('[data-ai]').onclick = (e) => aiFill(e.currentTarget, { ...ctx, scope: `journey-${tab}`, existing: state.sensory[tab] }, r => { state.sensory[tab] = r.story; ta.value = r.story; });
            }
            else if (state.i === 4) {
                engine.setScene('beach');
                renderUI(ui, `<div class="mw-beach-voice"><div class="mw-readable beach-card"><small>EURE PERSPEKTIVE</small><h2>${esc(state.question)}</h2>${editor('jvoice', state.answer, 'Deine Erinnerung – mit sicherem Untergrund, immer lesbar.')}<div class="mw-reactions">${REACTIONS.slice(0, 36).map(x => `<button class="${state.reaction === x ? 'on' : ''}" data-r="${x}">${x}</button>`).join('')}</div><button class="mw-question" data-q>↻ andere Frage</button></div>${voices(members, fresh?.contributions || [])}</div>${next('Zum gemeinsamen Schnitt')}`, 'beach');
                bindEditor(ui, 'jvoice', v => state.answer = v);
                ui.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => { state.reaction = b.dataset.r; show(); });
                ui.querySelector('[data-q]').onclick = () => { state.question = JQ[(JQ.indexOf(state.question) + 1) % JQ.length]; show(); };
            }
            else if (state.i === 5) {
                engine.setScene('studio');
                const ctx = { scope: 'journey-final', destination: dest, place: '', date: '', photoCount: src.media.length, facts: factsOf(src.media), voices: [plain(state.answer)], sensory: state.sensory, existing: state.story, media: src.media };
                renderUI(ui, `<div class="mw-finalcut"><div class="mw-readable final-copy"><small>FINAL CUT</small><h2>Was bekommt die Hauptrolle?</h2><p>Herzstücke führen Story, Reel und Reisefilm. Das Cover ist klar markiert.</p><input data-title value="${esc(state.title || `Unsere Reise nach ${dest}`)}">${aiBtn('KI: Titel + Geschichte', 'compose')}${editor('jstory', state.story, 'Luvia schreibt aus belegten Bildern, Orten und euren Stimmen einen Entwurf …')}${toneButtons()}</div><div class="mw-cut-grid">${src.media.slice(0, 12).map((m, i) => `<article class="${String(state.cover) === String(m.id) ? 'cover' : ''}"><figure data-cut="${i}"></figure><button data-weight="${m.id}" class="w${state.weights[String(m.id)]}">${weightName(state.weights[String(m.id)])}</button><button data-cover="${m.id}">${String(state.cover) === String(m.id) ? '✓ Euer Cover' : 'Als Cover'}</button></article>`).join('')}</div></div>${next('Premiere & Export')}`, 'finalcut');
                src.media.slice(0, 12).forEach((m, i) => img(ui.querySelector(`[data-cut="${i}"]`), m));
                bindEditor(ui, 'jstory', v => state.story = v);
                const ti = ui.querySelector('[data-title]');
                ti.oninput = () => state.title = ti.value;
                ui.querySelectorAll('[data-weight]').forEach((b) => b.onclick = () => { const id = b.dataset.weight, n = cycleWeight(Number(state.weights[id] || 2)); state.weights[id] = n; b.className = 'w' + n; b.textContent = weightName(n); });
                ui.querySelectorAll('[data-cover]').forEach((b) => b.onclick = () => { state.cover = b.dataset.cover; show(); });
                ui.querySelector('[data-ai="compose"]').onclick = (e) => aiFill(e.currentTarget, ctx, r => { state.title = r.titles[0] || state.title; state.story = `<p>${esc(r.story)}</p>`; show(); });
                ui.querySelectorAll('[data-tone]').forEach((b) => b.onclick = () => aiFill(b, { ...ctx, tone: `Bitte ${TONES[b.dataset.tone].toLowerCase()} formulieren.`, existing: state.story }, r => { state.story = `<p>${esc(r.story)}</p>`; show(); }, true));
            }
            else {
                engine.setScene('premiere');
                const sorted = [...src.media].sort((a, b) => (state.weights[String(b.id)] || 2) - (state.weights[String(a.id)] || 2)), latest = state.id ? await window.LuviaMemoryJourneys.get(state.id) : fresh, vs = latest?.contributions || [];
                renderUI(ui, `<div class="mw-premiere journey-premiere"><div class="mw-premiere-images">${sorted.slice(0, 6).map((m, i) => `<figure class="${i === 0 ? 'on' : ''}" data-p="${i}"></figure>`).join('')}</div><div class="mw-readable premiere-copy"><small>LUVIA MEMORY JOURNEY</small><h1>${esc(state.title || `Unsere Reise nach ${dest}`)}</h1><p>${esc(plain(state.story).slice(0, 450))}</p><div class="mw-facts"><span>${state.days.length} Tage</span><span>${src.media.length} Bilder</span><span>${members.length} Reisende</span></div></div>${voices(members, vs)}<div class="mw-export-dock"><button data-publish>Gemeinsam bewahren</button><button data-story>Story Set · 3 Frames</button><button data-reel>Reel · MP4</button><button data-post>Post · Collage</button><button data-film>Luvia Film · MP4</button></div></div>`, 'premiere');
                sorted.slice(0, 6).forEach((m, i) => img(ui.querySelector(`[data-p="${i}"]`), m));
                const model = () => ({ title: state.title || `Unsere Reise nach ${dest}`, story: state.story, media: sorted, weights: state.weights, cover: state.cover, days: state.days, voices: vs.map((v) => ({ ...v, displayName: members.find(m => String(m.id) === String(v.user_id))?.displayName || 'Reisender' })), sensory: state.sensory, destination: dest });
                ui.querySelector('[data-story]').onclick = async () => { toast('Luvia baut drei gemischte Story-Frames …'); await window.LuviaMemoryExportEngine.exportStory(model()); };
                ui.querySelector('[data-post]').onclick = () => window.LuviaMemoryExportEngine.exportPost(model());
                ui.querySelector('[data-reel]').onclick = async () => { try {
                    toast('Luvia rendert ein echtes MP4-Reel …');
                    await window.LuviaMemoryExportEngine.exportReel(model());
                }
                catch (e) {
                    toast(e.message);
                } };
                ui.querySelector('[data-film]').onclick = async () => { try {
                    toast('Luvia rendert euren MP4-Reisefilm …');
                    await window.LuviaMemoryExportEngine.exportFilm(model());
                }
                catch (e) {
                    toast(e.message);
                } };
                ui.querySelector('[data-publish]').onclick = async () => { await save('published'); toast('Eure Journey ist gemeinsam bewahrt.'); close(); renderHome(); };
            }
            const nb = ui.querySelector('[data-next]');
            if (nb)
                nb.onclick = async () => { if (state.i > 0)
                    await save('draft'); state.i = Math.min(N - 1, state.i + 1); show(); };
        }
        show();
    }
    async function mount(node) { host = node; await renderHome(); stopAlbums = await window.LuviaMemoryAlbums.subscribe(() => setTimeout(renderHome, 500)); stopJourneys = await window.LuviaMemoryJourneys.subscribe(() => setTimeout(renderHome, 500)); return () => { stopAlbums?.(); stopJourneys?.(); host = null; }; }
    window.LuviaAlbumsView = Object.freeze({ version: VERSION, build: BUILD, mount, render: renderHome, experience: 'memory-render-engine-v1', renderer: 'TypeScript + WebGL2/GLSL', exports: 'Canvas + MP4 MediaRecorder' });
})();
