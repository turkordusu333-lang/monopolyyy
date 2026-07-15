// Üretim (canlı) web sitesinde miyiz kontrol et (Render üzerinde yayındayken hostname 'localhost' veya local IP'ler olmaz)
const isLiveWeb = 
  typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1' && 
  window.location.protocol !== 'file:' &&
  !window.location.hostname.startsWith('192.168.'); // Yerel ağ testleri için

// Canlı web sitesindeysek göreceli path kullan (CORS engeline takılmamak için)
// Mobil uygulamada (APK) veya yerel testlerde ise Render URL'sini zorunlu tut
export const API_BASE_URL = isLiveWeb
  ? ""
  : "https://monopolyyy.onrender.com";

// Canlı web sitesindeysek o anki host üzerinden secure websocket (wss) veya ws aç, APK'daysa doğrudan Render wss adresine bağlan
export const WS_BASE_URL = isLiveWeb
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
  : "wss://monopolyyy.onrender.com";
