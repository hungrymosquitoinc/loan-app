const axios = require('axios');
const cfg = require('./supabase-config.json');
const key = cfg.serviceRoleKey || cfg.secretKey;
const url = cfg.supabaseUrl;

async function fixImages() {
  const r = await axios.get(url + '/rest/v1/profiles?role=eq.borrower&select=id,name,id_image,selfie_image,qr_data', {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    timeout: 15000
  });
  for (const b of r.data) {
    const updates = {};
    for (const field of ['id_image', 'selfie_image', 'qr_data']) {
      if (b[field] && b[field].includes('&#x2F;')) {
        updates[field] = b[field]
          .replace(/&#x2F;/g, '/')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'");
      }
    }
    if (Object.keys(updates).length > 0) {
      await axios.patch(url + '/rest/v1/profiles?id=eq.' + b.id, updates, {
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        timeout: 10000
      });
      console.log('Fixed: ' + b.name + ' - ' + Object.keys(updates).join(', '));
    } else {
      console.log('OK: ' + b.name);
    }
  }
}
fixImages().catch(e => console.error(e.message));
