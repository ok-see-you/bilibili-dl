// offscreen.js — 在 DOM 上下文中创建 Blob URL 并用 <a> 点击下载
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  // 视频/音频下载
  if (msg.action === 'DO_DOWNLOAD') {
    var url = msg.url;
    var filename = msg.filename;

    fetch(url)
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
      })
      .then(function(blob) {
        var blobUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          a.remove();
          URL.revokeObjectURL(blobUrl);
          chrome.runtime.sendMessage({ action: 'DOWNLOAD_DONE' });
        }, 1000);
      })
      .catch(function(err) {
        chrome.runtime.sendMessage({ action: 'DOWNLOAD_ERROR', error: err.message });
      });

    sendResponse({ ok: true });
    return true;
  }

  // 字幕下载
  if (msg.action === 'DO_SUB_DOWNLOAD') {
    var content = msg.content;
    var filename = msg.filename;

    var blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      a.remove();
      URL.revokeObjectURL(blobUrl);
      chrome.runtime.sendMessage({ action: 'DOWNLOAD_DONE' });
    }, 500);

    sendResponse({ ok: true });
    return true;
  }
});
