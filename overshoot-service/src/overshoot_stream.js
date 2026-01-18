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

const { rgbaToI420 } = wrtc.nonstandard;

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
    this.statsInterval = null;
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
        if (!this.pc) return;
        console.log("OvershootStreamSession ICE gathering:", this.pc.iceGatheringState);
      };
      this.pc.oniceconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        if (!this.pc) return;
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
      this.setupStats();
      this.isStarted = true;
    } catch (err) {
      this.onError?.(err);
      throw err;
    }
  }

  setupStats() {
    if (!this.pc) return;
    this.statsInterval = setInterval(async () => {
      try {
        if (!this.pc) return;
        const stats = await this.pc.getStats();
        let outbound = null;
        stats.forEach((report) => {
          if (report.type === "outbound-rtp" && report.kind === "video") {
            outbound = report;
          }
        });
        if (outbound) {
          // eslint-disable-next-line no-console
          console.log(
            "OvershootStreamSession outbound video:",
            `bytesSent=${outbound.bytesSent ?? "?"}`,
            `packetsSent=${outbound.packetsSent ?? "?"}`,
            `framesEncoded=${outbound.framesEncoded ?? "?"}`
          );
        }
      } catch (err) {
        // ignore stats errors
      }
    }, 2000);
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
      // eslint-disable-next-line no-console
      console.error("OvershootStreamSession results websocket error:", err);
      this.onError?.(err);
    });

    this.resultsWs.on("close", (code, reason) => {
      // eslint-disable-next-line no-console
      console.log(
        "OvershootStreamSession results websocket closed:",
        `code=${code}`,
        `reason=${reason?.toString?.() ?? ""}`
      );
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

    // Convert RGBA -> I420 using libyuv bindings from @roamhq/wrtc
    const rgbaFrame = {
      width,
      height,
      data: data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    };
    const i420Data = new Uint8ClampedArray(width * height * 1.5);
    const i420Frame = { width, height, data: i420Data };
    rgbaToI420(rgbaFrame, i420Frame);
    this.videoSource.onFrame(i420Frame);
  }

  async stop() {
    try {
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
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
        // Prevent late ICE events after teardown from touching a nulled pc
        try {
          this.pc.onicegatheringstatechange = null;
          this.pc.oniceconnectionstatechange = null;
          this.pc.onicecandidate = null;
        } catch {}
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

