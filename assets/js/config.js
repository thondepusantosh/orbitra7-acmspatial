/* ==========================================================================
   ORBITRA7 — site configuration
   Everything you may need to change lives here.
   (The WhatsApp group link is NOT here on purpose — it lives in the Apps Script
   backend and is only sent to a team after its registration is saved.)
   ========================================================================== */
window.ORBITRA7 = {
  // Google Apps Script Web App URL (Deploy → Web app → copy the URL ending in /exec)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxrjZPYlvYpmnGkAmP1jFTlw4LDL_y_2RANY6kteZzPVr5hI7nF-_vIJwg1RRMf8nF5UA/exec',

  MAX_TEAMS: 35,
  EVENT_START: '2026-10-10T09:00:00+05:30', // countdown target (IST)
  EVENT_END: '2026-10-10T18:00:00+05:30',

  UPI_ID: 'ipsithapinisetti@okicici',

  // UPI QR per team size (QR_750 / QR_1000 / QR_1250).
  // qr = shown on the page, download = file saved by the "Save QR" button.
  PAYMENT: {
    3: { amount: 750, qr: 'assets/img/qr-750.webp', download: 'assets/img/qr-750.jpg' },
    4: { amount: 1000, qr: 'assets/img/qr-1000.webp', download: 'assets/img/qr-1000.jpg' },
    5: { amount: 1250, qr: 'assets/img/qr-1250.webp', download: 'assets/img/qr-1250.jpg' },
  },

  // Problem statements — download buttons unlock once RELEASE has passed AND a file is set.
  // On 9 Oct: put the PDFs in assets/docs/ (e.g. 'assets/docs/track-1.pdf') or paste a
  // Google Drive "anyone with the link" URL, then publish. Leave '' until then.
  PROBLEM_STATEMENTS: {
    RELEASE: '2026-10-09T18:00:00+05:30', // 9 Oct, 6:00 PM IST
    TRACK_1: '',
    TRACK_2: '',
  },

  // Example of a correct payment screenshot (DEMO_SCREENSHOT)
  DEMO_SCREENSHOT: 'assets/img/demo-screenshot.svg',
};
