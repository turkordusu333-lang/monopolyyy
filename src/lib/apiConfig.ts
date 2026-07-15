// Tarayıcı dışındaki gerçek yerel Android/Capacitor uygulamasında mıyız kontrol et
const isCapacitor = 
  typeof window !== 'undefined' && 
  ((window as any).Capacitor || 
   window.location.protocol === 'file:' || 
   (window.location.hostname === 'localhost' && !window.location.port));

// Web tarayıcısında istekleri '/' (göreceli) olarak gönder (CORS hatasını önler)
// Sadece APK/Mobil içinde Render URL'sini zorunlu kıl
export const API_BASE_URL = isCapacitor
  ? "https://monopolyyy.onrender.com"
  : "";

// WebSocket protocol helper:
export const WS_BASE_URL = isCapacitor
  ? "wss://monopolyyy.onrender.com"
  : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
