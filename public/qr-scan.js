// Scan a room's QR code with the phone's camera, inside the join screen.
// Uses the browser's own barcode reader where there is one (Android Chrome),
// and the bundled jsQR decoder (Apache-2.0, /qr/jsQR.js) everywhere else, so
// it also works on iPhones. Frames never leave the phone: nothing is uploaded
// or stored, and the camera is switched off the moment a code is read or the
// scanner is closed.

let decoder;
function loadDecoder() {
  decoder ??= new Promise((resolve, reject) => {
    if (window.jsQR) return resolve(window.jsQR);
    const script = document.createElement('script');
    script.src = '/qr/jsQR.js';
    script.onload = () => window.jsQR ? resolve(window.jsQR) : reject(new Error('The QR reader did not load.'));
    script.onerror = () => reject(new Error('The QR reader did not load.'));
    document.head.append(script);
  });
  return decoder;
}

export const canScan = () => Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Start the camera in `video` and call `onText` with each QR code's text until
 * it returns true (accepted). Resolves to a function that stops the camera.
 */
export async function startScan(video, onText) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
  let running = true;
  const stop = () => {
    running = false;
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };
  try {
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    let native;
    if ('BarcodeDetector' in window) {
      try { if ((await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) native = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { /* fall back */ }
    }
    const jsQR = native ? undefined : await loadDecoder();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const read = async () => {
      if (!video.videoWidth) return undefined;
      if (native) return (await native.detect(video))[0]?.rawValue;
      // A 640-wide frame is plenty for a QR code and keeps older phones smooth.
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data;
    };
    const tick = async () => {
      if (!running) return;
      try {
        const text = await read();
        if (text && running && onText(text) === true) return stop();
      } catch { /* a bad frame: try the next one */ }
      if (running) setTimeout(tick, 160);
    };
    tick();
  } catch (error) { stop(); throw error; }
  return stop;
}
