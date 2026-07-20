// Üretim (canlı) web sitesinde miyiz kontrol et (Render üzerinde yayındayken hostname 'localhost' veya local IP'ler olmaz)
const isLiveWeb =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1' &&
  window.location.protocol !== 'file:' &&
  !window.location.hostname.startsWith('192.168.') &&
  !window.location.hostname.startsWith('10.') &&
  !window.location.hostname.startsWith('172.') &&
  window.location.port === '';

// Yerel tarayıcı geliştirme ortamında mıyız kontrol et (port numarası içeren her yerel hostname)
const isLocalBrowser =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')) &&
  window.location.port !== '';

// Canlı web sitesindeysek göreceli path kullan (CORS engeline takılmamak için)
// Mobil uygulamada (APK) ise Render URL'sini zorunlu tut
// Yerel tarayıcı testlerinde ise yerel 3000 portuna yönlendir
export const API_BASE_URL = isLiveWeb
  ? ""
  : isLocalBrowser
    ? `http://${window.location.hostname}:3000`
    : "http://16.170.166.112:3000";

// Canlı web sitesindeysek o anki host üzerinden secure websocket (wss) veya ws aç
// Yerel tarayıcı testlerinde local ws aç, APK'daysa doğrudan Render wss adresine bağlan
export const WS_BASE_URL = isLiveWeb
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
  : isLocalBrowser
    ? `ws://${window.location.hostname}:3000`
    : "ws://16.170.166.112:3000";
