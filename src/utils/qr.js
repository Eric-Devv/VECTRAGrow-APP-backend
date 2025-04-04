const qrcode = require('qrcode');

async function generateQRCode(data, options = {}) {
  try {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    };

    const qrOptions = { ...defaultOptions, ...options };
    const qrCodeDataUrl = await qrcode.toDataURL(data, qrOptions);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
}

module.exports = {
  generateQRCode
}; 