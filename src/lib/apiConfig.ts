// Üretim (canlı) web sitesinde miyiz kontrol et (Render üzerinde yayındayken hostname 'localhost' veya local IP'ler olmaz)
const isLiveWeb = 
  typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1' && 
  window.location.protocol !== 'file:' &&
  !window.location.hostname.startsWith('192.168.'); // Yerel ağ testleri için

// Yerel tarayıcı geliştirme ortamında mıyız kontrol et (port numarası içeren localhost/127.0.0.1)
const isLocalBrowser = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  window.location.port !== '';

// Canlı web sitesindeysek göreceli path kullan (CORS engeline takılmamak için)
// Mobil uygulamada (APK) ise Render URL'sini zorunlu tut
// Yerel tarayıcı testlerinde ise yerel 3000 portuna yönlendir
export const API_BASE_URL = isLiveWeb
  ? ""
  : isLocalBrowser
    ? `http://${window.location.hostname}:3000`
    : "https://monopolyyy.onrender.com";

// Canlı web sitesindeysek o anki host üzerinden secure websocket (wss) veya ws aç
// Yerel tarayıcı testlerinde local ws aç, APK'daysa doğrudan Render wss adresine bağlan
export const WS_BASE_URL = isLiveWeb
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
  : isLocalBrowser
    ? `ws://${window.location.hostname}:3000`
    : "wss://monopolyyy.onrender.com";
