// 从B站页面提取 bvid（多种路径兜底）
function extractBvidFromUrl() {
  const url = window.location.href;
  // 标准 /video/BVxxx
  let m = url.match(/\/video\/(BV[a-zA-Z0-9]{10,})/);
  if (m) return m[1];
  // 番剧 /bangumi/play/ss12345 或 /bangumi/play/ep12345
  m = url.match(/\/bangumi\/play\/(?:ss|ep)(\d+)/);
  if (m) return m[1]; // 番剧只用 season/ep id，不走 bvid
  // 直播等不处理
  return null;
}

// 尝试多种方式提取视频信息
function getPageVideoInfo() {
  const url = new URL(window.location.href);
  const isBangumi = url.pathname.startsWith('/bangumi/play/');

  let bvid, aid, cid, title;

  // ── 方式1：__INITIAL_STATE__（传统SSR注入）──
  let state = window.__INITIAL_STATE__;
  // B站新版可能把数据放在不同位置
  if (!state) state = window.__INITIAL_SSR_STATE__;
  if (!state && window.__RENDER_DATA__) state = window.__RENDER_DATA__;
  if (!state && window.__NEXT_DATA__?.props?.pageProps?.videoData) state = window.__NEXT_DATA__.props.pageProps;

  if (state) {
    // 番剧页面
    if (isBangumi && (state.epInfo || state.epList)) {
      const ep = state.epInfo || (state.epList && state.epList[0]);
      if (ep) {
        bvid  = ep.bvid;
        aid   = ep.aid;
        cid   = ep.cid;
        title = state.mediaInfo?.title || state.h1Title || document.title;
        if (bvid && cid) return { bvid, aid, cid, title, pageCount: 1, currentPage: 1 };
      }
    }

    // 普通视频
    const videoData = state.videoData || state.videoInfo || {};
    bvid  = videoData.bvid  || state.bvid;
    aid   = videoData.aid   || state.aid;
    const pages = videoData.pages || state.pages || [];

    const pParam = parseInt(url.searchParams.get('p') || '1', 10);
    let partTitle = '';
    if (pages.length > 0) {
      const page = pages[pParam - 1] || pages[0];
      cid = page.cid;
      if (pages.length > 1) partTitle = ` P${pParam} ${page.part || ''}`;
    } else {
      cid = videoData.cid || state.cid;
    }

    title = (videoData.title || state.title || document.title) + partTitle;

    if (bvid && cid) {
      return { bvid, aid, cid, title, pageCount: pages.length, currentPage: pParam };
    }
  }

  // ── 方式2：从 URL 提取 bvid，cid 留空让 popup 走 API 兜底 ──
  const urlBvid = extractBvidFromUrl();
  if (urlBvid) {
    return { bvid: urlBvid, aid: null, cid: null, title: document.title, partial: true };
  }

  return null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'GET_VIDEO_INFO') {
    sendResponse(getPageVideoInfo());
    return true;
  }

  // 通过 <a> 点击触发下载（走正常浏览器网络栈，declarativeNetRequest Referer注入生效）
  if (msg.action === 'TRIGGER_DOWNLOAD') {
    const { url, filename } = msg;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 3000);
    sendResponse({ success: true });
    return true;
  }
});
