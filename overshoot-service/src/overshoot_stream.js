import WebSocket from "ws";
import * as jpeg from "jpeg-js";
import wrtc from "@roamhq/wrtc";

const DEFAULT_ICE_SERVERS = [
  {
    urls: "turn:34.63.114.235:3478",
    username: "1769538895:c66a907c-61f4-4ec2-93a6-9d6b932776bb",
    credential: "Fu9L4CwyYZvsOLc+23psVAo3i/Y=",
  },
];

function baseUrlToWsUrl(baseUrl) {
  return baseUrl.replace("http://", "ws://").replace("https://", "wss://");
}

function clampByte(x) {
  if (x < 0) return 0;
  if (x > 255) return 255;
  return x;
}

// Convert RGBA (width*height*4) -> I420 (Y plane + U plane + V plane)
// I420 size: width*height + (width/2*height/2)*2
function rgbaToI420(rgba, width, height) {
  const ySize = width * height;
  const uvWidth = Math.floor(width / 2);
  const uvHeight = Math.floor(height / 2);
  const uvSize = uvWidth * uvHeight;

  const out = Buffer.allocUnsafe(ySize + uvSize * 2);
  const yPlane = out.subarray(0, ySize);
  const uPlane = out.subarray(ySize, ySize + uvSize);
  const vPlane = out.subarray(ySize + uvSize, ySize + uvSize * 2);

  // Y for every pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgbaIdx = (y * width + x) * 4;
      const r = rgba[rgbaIdx];
      const g = rgba[rgbaIdx + 1];
      const b = rgba[rgbaIdx + 2];
      // BT.601 limited range approximation
      const yy = clampByte(((66 * r + 129 * g + 25 * b + 128) >> 8) + 16);
      yPlane[y * width + x] = yy;
    }
  }

  // U/V subsampled 2x2
  for (let y = 0; y < uvHeight; y++) {
    for (let x = 0; x < uvWidth; x++) {
      const px = x * 2;
      const py = y * 2;

      // average of 2x2 pixels
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const ix = px + dx;
          const iy = py + dy;
          if (ix >= width || iy >= height) continue;
          const idx = (iy * width + ix) * 4;
          r += rgba[idx];
          g += rgba[idx + 1];
          b += rgba[idx + 2];
        }
      }
      r = r >> 2;
      g = g >> 2;
      b = b >> 2;

      const uu = clampByte(((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128);
      const vv = clampByte(((112 * r - 94 * g - 18 * b + 128) >> 8) + 128);

      const uvIdx = y * uvWidth + x;
      uPlane[uvIdx] = uu;
      vPlane[uvIdx] = vv;
    }
  }

  return out;
}

export class OvershootStreamSession {
  constructor({
    apiUrl,
    apiKey,
    prompt,
    outputSchemaJson,
    processing,
    onResult,
    onError,
  }) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.prompt = prompt;
    this.outputSchemaJson = outputSchemaJson;
    this.processing = processing;
    this.onResult = onResult;
    this.onError = onError;

    this.pc = null;
    this.videoSource = null;
    this.videoTrack = null;
    this.streamId = null;
    this.resultsWs = null;
    this.keepaliveInterval = null;
    this.isStarted = false;
    this.lastFrameAt = 0;
  }

  async start() {
    if (this.isStarted) return;

    try {
      const { nonstandard } = wrtc;
      if (!nonstandard?.RTCVideoSource) {
        throw new Error("RTCVideoSource not available in @roamhq/wrtc");
      }

      this.videoSource = new nonstandard.RTCVideoSource();
      this.videoTrack = this.videoSource.createTrack();

      this.pc = new wrtc.RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      this.pc.onicegatheringstatechange = () => {
        // eslint-disable-next-line no-console
        console.log("OvershootStreamSession ICE gathering:", this.pc.iceGatheringState);
      };
      this.pc.oniceconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        console.log("OvershootStreamSession ICE connection:", this.pc.iceConnectionState);
      };
      this.pc.addTrack(this.videoTrack);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      // Wait for ICE candidates to be gathered into the SDP (important for node-webrtc)
      await new Promise((resolve) => {
        if (!this.pc) return resolve();
        if (this.pc.iceGatheringState === "complete") return resolve();

        let resolved = false;
        const timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          resolve();
        }, 2000);

        this.pc.onicecandidate = (event) => {
          // event.candidate == null means gathering complete
          if (!event.candidate && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve();
          }
        };
      });
      if (!this.pc.localDescription?.sdp) {
        throw new Error("Failed to create local description SDP");
      }

      const body = {
        webrtc: { type: "offer", sdp: this.pc.localDescription.sdp },
        processing: {
          sampling_ratio: this.processing?.sampling_ratio ?? 0.1,
          fps: this.processing?.fps ?? 30,
          clip_length_seconds: this.processing?.clip_length_seconds ?? 1,
          delay_seconds: this.processing?.delay_seconds ?? 1,
        },
        inference: {
          prompt: this.prompt,
          backend: "overshoot",
          model: this.processing?.model ?? "Qwen/Qwen3-VL-30B-A3B-Instruct",
          output_schema_json: this.outputSchemaJson,
        },
      };

      const response = await fetch(`${this.apiUrl}/streams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const msg = json?.message || json?.error || response.statusText;
        const requestId = json?.request_id ? ` request_id=${json.request_id}` : "";
        const details = json?.details ? ` details=${JSON.stringify(json.details)}` : "";
        throw new Error(`Overshoot /streams error ${response.status}: ${msg}${requestId}${details}`);
      }

      this.streamId = json.stream_id;
      if (!json.webrtc?.sdp) {
        throw new Error("Overshoot response missing webrtc.sdp");
      }

      await this.pc.setRemoteDescription(
        new wrtc.RTCSessionDescription({ type: "answer", sdp: json.webrtc.sdp })
      );

      this.connectResultsWebSocket();
      this.setupKeepalive(json.lease?.ttl_seconds);
      this.isStarted = true;
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  setupKeepalive(ttlSeconds) {
    const intervalMs = ttlSeconds ? (ttlSeconds / 2) * 1000 : 15000;
    this.keepaliveInterval = setInterval(async () => {
      try {
        if (!this.streamId) return;
        await fetch(`${this.apiUrl}/streams/${this.streamId}/keepalive`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });
      } catch (err) {
        this.onError?.(err);
      }
    }, intervalMs);
  }

  connectResultsWebSocket() {
    if (!this.streamId) return;

    const wsUrl = `${baseUrlToWsUrl(this.apiUrl)}/ws/streams/${this.streamId}`;
    this.resultsWs = new WebSocket(wsUrl);

    this.resultsWs.on("open", () => {
      // eslint-disable-next-line no-console
      console.log("OvershootStreamSession results websocket connected");
      this.resultsWs?.send(JSON.stringify({ api_key: this.apiKey }));
    });

    this.resultsWs.on("message", (data) => {
      try {
        const text = data.toString();
        // eslint-disable-next-line no-console
        console.log("OvershootStreamSession result message:", text.slice(0, 200));
        const parsed = JSON.parse(text);
        this.onResult?.(parsed);
      } catch (err) {
        this.onError?.(err);
      }
    });

    this.resultsWs.on("error", (err) => {
      this.onError?.(err);
    });

    this.resultsWs.on("close", () => {
      // no-op; session stop handles cleanup
    });
  }

  pushJpegFrame(jpegBuffer) {
    if (!this.videoSource) return;

    // Throttle to avoid flooding (server-side safety)
    const now = Date.now();
    if (now - this.lastFrameAt < 150) return; // ~6-7 fps max
    this.lastFrameAt = now;

    const decoded = jpeg.decode(jpegBuffer, { useTArray: true });
    const { width, height, data } = decoded;
    if (!width || !height || !data) return;

    const i420 = rgbaToI420(data, width, height);
    this.videoSource.onFrame({ width, height, data: i420 });
  }

  async stop() {
    try {
      if (this.keepaliveInterval) {
        clearInterval(this.keepaliveInterval);
        this.keepaliveInterval = null;
      }

      if (this.resultsWs) {
        try {
          this.resultsWs.close();
        } catch {}
        this.resultsWs = null;
      }

      if (this.videoTrack) {
        try {
          this.videoTrack.stop();
        } catch {}
        this.videoTrack = null;
      }

      if (this.pc) {
        try {
          this.pc.close();
        } catch {}
        this.pc = null;
      }

      this.videoSource = null;
      this.streamId = null;
      this.isStarted = false;
    } catch (err) {
      this.onError?.(err);
    }
  }
}

