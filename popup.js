var __app = document.getElementById('app');

// 全局兜底：吞掉扩展上下文失效导致的未捕获 rejection
window.addEventListener('unhandledrejection', function(e) { e.preventDefault(); });

function setStatus(msg, type) {
  var el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status ' + (type || '');
  if (type === 'success') setTimeout(function() { el.textContent = ''; }, 3000);
}

function sendBg(msg) {
  return new Promise(function(resolve, reject) {
    chrome.runtime.sendMessage(msg, function(res) {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (res && res.error) return reject(new Error(res.error));
      resolve(res);
    });
  });
}

function safeName(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 200);
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

var QUALITY_DESC = {
  127: '8K 超高清', 126: '杜比视界', 125: 'HDR', 120: '4K 超清',
  116: '1080P60 高清', 112: '1080P+ 高清', 80: '1080P 高清',
  74: '720P60 准高清', 64: '720P 准高清', 32: '480P 标清', 16: '360P 流畅'
};

// 模拟进度条动画：启动后定时递增 percentage 直到 stopped
function startProgress(btn) {
  var p = 0;
  btn.setAttribute('data-pct', '0%');
  var timer = setInterval(function() {
    p += Math.random() * 18 + 4;
    if (p > 90) p = 90;
    btn.setAttribute('data-pct', Math.round(p) + '%');
  }, 400);
  btn._progressTimer = timer;
}

function stopProgress(btn) {
  if (btn._progressTimer) { clearInterval(btn._progressTimer); btn._progressTimer = null; }
  btn.setAttribute('data-pct', '100%');
  setTimeout(function() { btn.removeAttribute('data-pct'); }, 600);
}

// ── 主流程 ──
(async function init() {
  var app = __app;

  // 1. 获取当前 tab
  var tabs;
  try { tabs = await chrome.tabs.query({ active: true, currentWindow: true }); }
  catch { app.innerHTML = '<div class="not-video">不支持的页面</div>'; return; }

  var tab = tabs && tabs[0];
  if (!tab || !tab.url) {
    app.innerHTML = '<div class="not-video">不支持的页面</div>';
    return;
  }

  if (!tab.url.match(/bilibili\.com\/(video|bangumi\/play)\//)) {
    app.innerHTML = '<div class="not-video"><p>不支持的页面</p></div>';
    return;
  }

  var pageInfo = null;
  var diag = '';

  // ▸ 策略A：注入 MAIN world 读取页面 state
  var resA = null;
  try {
    var result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: function() {
        var s = window.__INITIAL_STATE__ || window.__INITIAL_SSR_STATE__ || window.__RENDER_DATA__ || (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps);
        if (s) {
          var ep = s.epInfo || (s.epList && s.epList[0]);
          if (ep && ep.bvid && ep.cid) {
            return { bvid: ep.bvid, cid: ep.cid, title: (s.mediaInfo && s.mediaInfo.title) || s.h1Title || document.title, aid: ep.aid };
          }
          var vd = s.videoData || s.videoInfo || {};
          var bvid = vd.bvid || s.bvid;
          var cid = vd.cid || s.cid;
          var pages = vd.pages || s.pages || [];
          var url = new URL(location.href);
          var pParam = parseInt(url.searchParams.get('p') || '1', 10);
          var page = pages[pParam - 1];
          var pcid = (page && page.cid) || cid;
          var title = vd.title || s.title || document.title;
          if (bvid && pcid) return { bvid: bvid, cid: pcid, title: title, aid: vd.aid || s.aid, pages: pages.length };
          if (bvid) return { bvid: bvid, title: title };
        }
        var m = location.href.match(/\/video\/(BV[a-zA-Z0-9]{10,})/);
        if (m) return { bvid: m[1], title: document.title };
        return null;
      }
    });
    resA = result && result[0] && result[0].result;
  } catch(e) { diag = ' [注入: ' + e.message + ']'; }

  if (resA) {
    if (resA.cid) {
      pageInfo = { bvid: resA.bvid, cid: resA.cid, aid: resA.aid || null, title: resA.title, pageCount: resA.pages || 1, currentPage: 1 };
      diag = ' (页面数据)';
    } else if (resA.bvid) {
      pageInfo = { bvid: resA.bvid, cid: null, aid: null, title: resA.title, pageCount: 1, currentPage: 1 };
      diag = ' (页面bvid)';
    }
  } else if (!diag) {
    diag = ' [页面无状态数据]';
  }

  // ▸ 策略B：内容脚本消息
  if (!pageInfo || !pageInfo.cid) {
    var csInfo = null;
    try {
      csInfo = await new Promise(function(resolve, reject) {
        chrome.tabs.sendMessage(tab.id, { action: 'GET_VIDEO_INFO' }, function(res) {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          resolve(res);
        });
      });
    } catch(e) {}
    if (csInfo && csInfo.cid) { pageInfo = csInfo; diag = ' (内容脚本)'; }
    else if (csInfo && csInfo.bvid && (!pageInfo || !pageInfo.bvid)) { pageInfo = csInfo; diag = ' (CS bvid)'; }
  }

  // ▸ 策略C：URL正则 + B站API
  if (!pageInfo || !pageInfo.cid) {
    var bvid = (pageInfo && pageInfo.bvid) || (tab.url.match(/\/video\/(BV[a-zA-Z0-9]{10,})/) || [])[1];
    if (bvid) {
      try {
        var apiInfo = await sendBg({ action: 'GET_VIDEO_INFO_BY_BVID', bvid: bvid });
        pageInfo = { bvid: bvid, cid: apiInfo.cid, aid: apiInfo.aid, title: apiInfo.title, pageCount: apiInfo.pageCount || 1, currentPage: 1 };
        diag = ' (API回退)';
      } catch(e) { diag = ' [该视频不支持下载]'; }
    } else {
      diag = ' [URL未识别到BV号]';
    }
  }

  if (!pageInfo || !pageInfo.bvid || !pageInfo.cid) {
    app.innerHTML = '<div class="not-video">不支持的页面</div>';
    return;
  }

  var _bvid = pageInfo.bvid, _cid = pageInfo.cid, _title = pageInfo.title;

  // 3. 向 background 获取下载信息
  app.innerHTML = '<div class="loading"><div class="spinner"></div><span>获取下载链接...</span></div>';

  var info;
  try {
    info = await sendBg({ action: 'GET_DOWNLOAD_INFO', bvid: _bvid, cid: _cid, title: _title });
  } catch(err) {
    app.innerHTML = '<div class="not-video">不支持的页面</div>';
    return;
  }

  var videos = info.videos, audios = info.audios, aiSubtitles = info.aiSubtitles, allSubs = info.subtitles;
  var subsToShow = aiSubtitles.length > 0 ? aiSubtitles : allSubs;

  // 读取上次保存的分辨率偏好
  var savedQuality = null;
  try {
    var stored = await new Promise(function(r) { chrome.storage.local.get('lastQuality', function(d) { r(d); }); });
    savedQuality = stored.lastQuality;
  } catch(e) {}

  // 确定默认选中的分辨率：有保存的优先，否则最高
  var defaultIdx = 0;
  if (savedQuality && videos.length > 0) {
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].quality === savedQuality) { defaultIdx = i; break; }
    }
  }

  // 4. 渲染 UI
  var html = '<div class="content">';
  html += '<div class="video-title" title="' + escHtml(_title) + '">' + escHtml(_title) + '</div><hr>';

  // 视频
  html += '<div><div class="section-label">分辨率</div><select id="video-select">';
  videos.forEach(function(v, i) {
    html += '<option value="' + escHtml(v.url) + '" data-q="' + v.quality + '"' + (i === defaultIdx ? ' selected' : '') + '>' + (QUALITY_DESC[v.quality] || v.label) + '</option>';
  });
  html += '</select></div>';

  html += '<div class="btn-group">';
  html += '<button class="btn btn-video" id="btn-dl-video"' + (videos.length === 0 ? ' disabled' : '') + '>📹 下载视频</button>';
  html += '<button class="btn btn-audio" id="btn-dl-audio"' + (audios.length === 0 ? ' disabled' : '') + '>🎵 下载音频</button></div><hr>';

  // 字幕
  html += '<div><div class="section-label">字幕</div>';
  if (subsToShow.length > 0) {
    html += '<div class="sub-list" id="sub-list">';
    subsToShow.forEach(function(s, i) {
      html += '<div class="sub-item"><span class="sub-name">' + escHtml(s.lan_doc || s.lan) + '</span>';
      if (s.type === 1 || s.ai_status === 2) html += '<span class="ai-badge">AI</span>';
      html += '<button class="btn-sub-dl" data-idx="' + i + '">下载字幕</button></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="status">该视频暂无字幕</div>';
  }
  html += '</div><hr>';

  // 作者
  html += '<a class="author-link" href="https://space.bilibili.com/509485177" target="_blank"><img class="author-cat" src="images/cat.png"> 这是谁做的耶?</a><hr>';

  html += '<div class="hint"><strong>注意：</strong>B站视频/音频是分离的，<br>下载后需用 <strong>ffmpeg</strong> 合并：<br><code style="font-size:10px;word-break:break-all">ffmpeg -i video.mp4 -i audio.m4a -c copy output.mp4</code></div>';
  html += '<div id="status" class="status"></div></div>';

  app.innerHTML = html;

  // 分辨率选择变化时保存偏好
  var videoSelect = document.getElementById('video-select');
  if (videoSelect) videoSelect.addEventListener('change', function() {
    var q = parseInt(videoSelect.selectedOptions[0].dataset.q, 10);
    chrome.storage.local.set({ lastQuality: q });
  });

  // ── 下载视频：走 background 代理（fetch + dataURL）──
  var btnVideo = document.getElementById('btn-dl-video');
  if (btnVideo) btnVideo.addEventListener('click', function() {
    var url = document.getElementById('video-select').value;
    var quality = document.getElementById('video-select').selectedOptions[0].text.split(' ')[0];
    var q = parseInt(document.getElementById('video-select').selectedOptions[0].dataset.q, 10);
    chrome.storage.local.set({ lastQuality: q });
    var filename = safeName(_title + '_' + quality + '视频.mp4');
    btnVideo.disabled = true;
    btnVideo.classList.add('downloading');
    startProgress(btnVideo);
    sendBg({ action: 'DOWNLOAD_STREAM', url: url, filename: filename }).then(function() {
      setStatus('下载完成', 'success');
    }).catch(function(e) {
      setStatus('下载失败：' + e.message, 'error');
    }).finally(function() {
      stopProgress(btnVideo);
      btnVideo.disabled = false;
      btnVideo.classList.remove('downloading');
    });
  });

  // ── 下载音频：走 background 代理 ──
  var btnAudio = document.getElementById('btn-dl-audio');
  if (btnAudio) btnAudio.addEventListener('click', function() {
    var audio = audios[0];
    if (!audio) return;
    var filename = safeName(_title + '_' + audio.label + '音频.m4a');
    btnAudio.disabled = true;
    btnAudio.classList.add('downloading');
    startProgress(btnAudio);
    sendBg({ action: 'DOWNLOAD_STREAM', url: audio.url, filename: filename }).then(function() {
      setStatus('下载完成', 'success');
    }).catch(function(e) {
      setStatus('下载失败：' + e.message, 'error');
    }).finally(function() {
      stopProgress(btnAudio);
      btnAudio.disabled = false;
      btnAudio.classList.remove('downloading');
    });
  });

  // ── 下载字幕 ──
  var subList = document.getElementById('sub-list');
  if (subList) subList.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-sub-dl');
    if (!btn) return;
    var idx = parseInt(btn.dataset.idx, 10);
    var subtitle = subsToShow[idx];
    btn.disabled = true;
    btn.classList.add('downloading');
    startProgress(btn);
    sendBg({ action: 'DOWNLOAD_SUBTITLE', subtitle: subtitle, title: _title }).then(function() {
      setStatus('字幕下载完成', 'success');
    }).catch(function(e) {
      setStatus('字幕下载失败：' + e.message, 'error');
    }).finally(function() {
      stopProgress(btn);
      btn.disabled = false;
      btn.classList.remove('downloading');
    });
  });

})().catch(function(err) {
  document.getElementById('app').innerHTML = '<div class="not-video">不支持的页面</div>';
});
