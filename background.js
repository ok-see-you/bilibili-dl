// ============================================================
// MD5 (纯JS实现，用于WBI签名)
// ============================================================
function md5(str) {
  function add32(x, y) { return (x + y) & 0xFFFFFFFF; }
  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t);
  const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t);
  const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t);
  const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t);

  function md5cycle(x, k) {
    let [a, b, c, d] = x;
    a=ff(a,b,c,d,k[0],7,-680876936);   d=ff(d,a,b,c,k[1],12,-389564586);
    c=ff(c,d,a,b,k[2],17,606105819);   b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);   d=ff(d,a,b,c,k[5],12,1200080426);
    c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);   d=ff(d,a,b,c,k[9],12,-1958414417);
    c=ff(c,d,a,b,k[10],17,-42063);     b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);  d=ff(d,a,b,c,k[13],12,-40341101);
    c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);   d=gg(d,a,b,c,k[6],9,-1069501632);
    c=gg(c,d,a,b,k[11],14,643717713);  b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);   d=gg(d,a,b,c,k[10],9,38016083);
    c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);    d=gg(d,a,b,c,k[14],9,-1019803690);
    c=gg(c,d,a,b,k[3],14,-187363961);  b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784);
    c=gg(c,d,a,b,k[7],14,1735328473);  b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);      d=hh(d,a,b,c,k[8],11,-2022574463);
    c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);  d=hh(d,a,b,c,k[4],11,1272893353);
    c=hh(c,d,a,b,k[7],16,-155497632);  b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);   d=hh(d,a,b,c,k[0],11,-358537222);
    c=hh(c,d,a,b,k[3],16,-722521979);  b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);   d=hh(d,a,b,c,k[12],11,-421815835);
    c=hh(c,d,a,b,k[15],16,530742520);  b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);   d=ii(d,a,b,c,k[7],10,1126891415);
    c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);  d=ii(d,a,b,c,k[3],10,-1894986606);
    c=ii(c,d,a,b,k[10],15,-1051523);   b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);   d=ii(d,a,b,c,k[15],10,-30611744);
    c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);   d=ii(d,a,b,c,k[11],10,-1120210379);
    c=ii(c,d,a,b,k[2],15,718787259);   b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]); x[1]=add32(b,x[1]);
    x[2]=add32(c,x[2]); x[3]=add32(d,x[3]);
  }

  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      const blk = [];
      for (let j = i - 64; j < i; j += 4)
        blk.push(s.charCodeAt(j) | (s.charCodeAt(j+1)<<8) | (s.charCodeAt(j+2)<<16) | (s.charCodeAt(j+3)<<24));
      md5cycle(state, blk);
    }
    s = s.substring(i - 64);
    const tail = new Array(16).fill(0);
    for (i = 0; i < s.length; i++) tail[i>>2] |= s.charCodeAt(i) << ((i%4)*8);
    tail[i>>2] |= 0x80 << ((i%4)*8);
    if (i > 55) { md5cycle(state, tail); tail.fill(0); }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  const state = md51(str);
  const hc = '0123456789abcdef';
  let hex = '';
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const byte = (state[i] >> (j * 8)) & 0xFF;
      hex += hc[byte >> 4] + hc[byte & 0xF];
    }
  return hex;
}

// ============================================================
// WBI 签名（B站接口鉴权）
// ============================================================
const MIXIN_KEY_ENC_TAB = [
  46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,
  33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,
  26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,
  20,34,44,52
];

let wbiKeyCache = null;
let wbiKeyPromise = null;  // 防并发重复请求

async function getWbiMixinKey(cookieStr) {
  if (wbiKeyCache && Date.now() - wbiKeyCache.ts < 3_600_000)
    return wbiKeyCache.key;

  // 防并发：复用进行中的请求
  if (wbiKeyPromise) return await wbiKeyPromise;

  wbiKeyPromise = (async () => {
    const res = await biliGet('https://api.bilibili.com/x/web-interface/nav', cookieStr);
    const imgKey = (res.data?.wbi_img?.img_url || '').split('/').pop().replace('.png', '');
    const subKey = (res.data?.wbi_img?.sub_url  || '').split('/').pop().replace('.png', '');
    const raw = imgKey + subKey;
    const key = MIXIN_KEY_ENC_TAB.map(n => raw[n]).join('').slice(0, 32);
    wbiKeyCache = { key, ts: Date.now() };
    return key;
  })();

  return await wbiKeyPromise;
}

function buildWbiQuery(params, mixinKey) {
  const wts = Math.round(Date.now() / 1000);
  const all = { ...params, wts };
  // 按key字典序排序，过滤特殊字符
  const qs = Object.keys(all).sort().map(k => {
    const v = String(all[k]).replace(/[!'()*]/g, '');
    return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }).join('&');
  const wRid = md5(qs + mixinKey);
  return `${qs}&w_rid=${wRid}`;
}

// ============================================================
// 通用 HTTP 请求
// ============================================================
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function getBiliCookies() {
  const cookies = await chrome.cookies.getAll({ domain: '.bilibili.com' });
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

async function biliGet(url, cookieStr) {
  const res = await fetch(url, {
    headers: {
      'Cookie': cookieStr,
      'Referer': 'https://www.bilibili.com/',
      'User-Agent': UA
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(`B站API错误 ${json.code}: ${json.message}`);
  return json;
}

// ============================================================
// B站 API
// ============================================================

// 视频基本信息（含 cid）
async function fetchVideoInfo(bvid, cookieStr) {
  const json = await biliGet(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, cookieStr);
  return {
    title: json.data.title,
    cid:   json.data.cid,
    aid:   json.data.aid,
    pages: json.data.pages
  };
}

// 播放地址（DASH，含视频流和音频流）
async function fetchPlayUrl(bvid, cid, cookieStr) {
  const mixinKey = await getWbiMixinKey(cookieStr);
  const query = buildWbiQuery({ bvid, cid, fnval: 4048, fnver: 0, fourk: 1 }, mixinKey);
  const json = await biliGet(
    `https://api.bilibili.com/x/player/wbi/playurl?${query}`,
    cookieStr
  );
  return json.data;
}

// 字幕列表
// 字幕列表（加 WBI 签名确保多P视频正确返回对应分P的字幕）
async function fetchSubtitleList(bvid, cid, cookieStr) {
  const mixinKey = await getWbiMixinKey(cookieStr);
  const query = buildWbiQuery({ bvid, cid }, mixinKey);
  const json = await biliGet(
    `https://api.bilibili.com/x/player/wbi/v2?${query}`,
    cookieStr
  );
  return json.data?.subtitle?.subtitles || [];
}

// 拉取字幕 JSON 并转 SRT
async function fetchSubtitleAsSrt(subtitleUrl, cookieStr) {
  const url = subtitleUrl.startsWith('//') ? 'https:' + subtitleUrl : subtitleUrl;
  const res = await fetch(url, {
    headers: { 'Cookie': cookieStr, 'Referer': 'https://www.bilibili.com/', 'User-Agent': UA }
  });
  const data = await res.json();
  return jsonBodyToSrt(data.body);
}

function jsonBodyToSrt(body) {
  const pad = (n, w) => String(n).padStart(w, '0');
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60),
          sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
    return `${pad(h,2)}:${pad(m,2)}:${pad(sec,2)},${pad(ms,3)}`;
  };
  return body.map((item, i) =>
    `${i + 1}\n${fmt(item.from)} --> ${fmt(item.to)}\n${item.content}\n`
  ).join('\n');
}

// ============================================================
// 质量标签
// ============================================================
const VIDEO_QUALITY_LABEL = {
  127:'8K', 126:'杜比视界', 125:'HDR', 120:'4K',
  116:'1080P60', 112:'1080P+', 80:'1080P',
  74:'720P60', 64:'720P', 32:'480P', 16:'360P'
};
const AUDIO_QUALITY_LABEL = {
  30251:'Dolby', 30280:'HiRes', 30232:'192kbps', 30216:'64kbps'
};

// ============================================================
// 工具函数
// ============================================================
// 从 lan_doc 提取简短中文语言名
function langName(lanDoc, lan) {
  var l = (lanDoc || lan || '');
  if (l.includes('中文')) return '中文';
  if (l.includes('英语') || l.includes('英文') || l.includes('en')) return '英文';
  if (l.includes('日语') || l.includes('日文') || l.includes('ja')) return '日文';
  if (l.includes('韩语') || l.includes('韩文') || l.includes('ko')) return '韩文';
  return l.replace(/[（）()]/g, '').slice(0, 8);
}

function sanitize(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 200);
}

// 将字符串编码为 base64 data URL（service worker 中无法用 Blob/URL.createObjectURL）
function textToDataUrl(text) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode('\uFEFF' + text); // UTF-8 BOM
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return 'data:text/plain;charset=utf-8;base64,' + btoa(binary);
}

// ============================================================
// Offscreen 文档管理（创建 Blob URL 触发下载）
// ============================================================
let offscreenReady = false;

async function ensureOffscreen() {
  if (offscreenReady) return;

  // 检查是否已有 offscreen 文档
  const hasIt = await chrome.offscreen.hasDocument();
  if (hasIt) { offscreenReady = true; return; }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'Create blob URLs for downloads'
  });
  offscreenReady = true;
}

// ============================================================
// 消息处理
// ============================================================
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(msg) {
  const cookieStr = await getBiliCookies();

  // ── 内部消息：offscreen 通信，不进入业务逻辑 ──
  if (msg.action === 'DO_DOWNLOAD' || msg.action === 'DOWNLOAD_DONE' || msg.action === 'DOWNLOAD_ERROR') {
    return null;
  }

  // ── 通过 bvid 获取视频基本信息（URL兜底）──
  if (msg.action === 'GET_VIDEO_INFO_BY_BVID') {
    const info = await fetchVideoInfo(msg.bvid, cookieStr);
    return {
      cid: info.cid,
      aid: info.aid,
      title: info.title,
      pageCount: info.pages?.length || 1
    };
  }

  // ── 获取下载选项 ──
  if (msg.action === 'GET_DOWNLOAD_INFO') {
    const { bvid, cid, title } = msg;

    const [playData, subtitles] = await Promise.all([
      fetchPlayUrl(bvid, cid, cookieStr),
      fetchSubtitleList(bvid, cid, cookieStr)
    ]);

    const dash = playData?.dash;
    if (!dash) {
      return {
        error: '该视频不支持下载',
        videos: [],
        audios: [],
        subtitles,
        aiSubtitles: [],
        title
      };
    }

    // 视频流：按质量去重，取第一个（base_url）
    const videoMap = {};
    for (const v of (dash.video || [])) {
      if (!videoMap[v.id]) videoMap[v.id] = {
        quality: v.id,
        label:   VIDEO_QUALITY_LABEL[v.id] || String(v.id),
        url:     v.base_url,
        codecs:  v.codecs
      };
    }

    // 音频流
    const audioMap = {};
    for (const a of (dash.audio || [])) {
      if (!audioMap[a.id]) audioMap[a.id] = {
        quality: a.id,
        label:   AUDIO_QUALITY_LABEL[a.id] || String(a.id),
        url:     a.base_url
      };
    }

    // 杜比音频（若有）
    if (dash.dolby?.audio?.length) {
      const da = dash.dolby.audio[0];
      audioMap[30251] = { quality: 30251, label: 'Dolby', url: da.base_url };
    }

    // AI字幕：type===1 或 ai_status===2
    const aiSubs = subtitles.filter(s => s.type === 1 || s.ai_status === 2);

    return {
      videos:      Object.values(videoMap).sort((a, b) => b.quality - a.quality),
      audios:      Object.values(audioMap).sort((a, b) => b.quality - a.quality),
      subtitles,
      aiSubtitles: aiSubs,
      title
    };
  }

  // ── 下载视频/音频：通过 offscreen 文档创建 Blob URL 下载 ──
  if (msg.action === 'DOWNLOAD_STREAM') {
    const { url, filename } = msg;
    const safeFilename = sanitize(filename);

    // 确保 offscreen 文档已创建
    await ensureOffscreen();

    // 发送下载任务
    return await new Promise((resolve, reject) => {
      const done = (resp) => {
        const handler = resp.action === 'DOWNLOAD_DONE' ? resolve : reject;
        handler(resp.action === 'DOWNLOAD_ERROR' ? new Error(resp.error) : resp);
      };
      chrome.runtime.onMessage.addListener(function listener(resp) {
        if (resp.action === 'DOWNLOAD_DONE' || resp.action === 'DOWNLOAD_ERROR') {
          chrome.runtime.onMessage.removeListener(listener);
          done(resp);
        }
      });
      chrome.runtime.sendMessage({ action: 'DO_DOWNLOAD', url, filename: safeFilename });
    });
  }

  // ── 下载字幕：通过 offscreen 文档 Blob 下载 ──
  if (msg.action === 'DOWNLOAD_SUBTITLE') {
    const { subtitle, title } = msg;
    const srt = await fetchSubtitleAsSrt(subtitle.subtitle_url, cookieStr);
    const filename = `${langName(subtitle.lan_doc, subtitle.lan)}_${sanitize(title)}.txt`;

    await ensureOffscreen();

    // 把字幕文本发到 offscreen，让其创建 Blob 下载
    return await new Promise((resolve, reject) => {
      const done = (resp) => {
        const handler = resp.action === 'DOWNLOAD_DONE' ? resolve : reject;
        handler(resp.action === 'DOWNLOAD_ERROR' ? new Error(resp.error) : resp);
      };
      chrome.runtime.onMessage.addListener(function listener(resp) {
        if (resp.action === 'DOWNLOAD_DONE' || resp.action === 'DOWNLOAD_ERROR') {
          chrome.runtime.onMessage.removeListener(listener);
          done(resp);
        }
      });
      chrome.runtime.sendMessage({
        action: 'DO_SUB_DOWNLOAD',
        filename,
        content: srt
      });
    });
  }

  throw new Error(`未知 action: ${msg.action}`);
}
