import { TraceStep } from './types';

export interface ExportOptions {
  format: 'gif' | 'webm';
  frameDelay: number; // ms between frames
  width: number;
  height: number;
  quality: number; // 0-1
}

export interface ExportProgress {
  stage: 'preparing' | 'capturing' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

// Simple canvas-based frame capture for code execution
export class ExecutionExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: ImageData[] = [];
  private options: ExportOptions;

  constructor(options: Partial<ExportOptions> = {}) {
    this.options = {
      format: options.format || 'gif',
      frameDelay: options.frameDelay || 500,
      width: options.width || 800,
      height: options.height || 600,
      quality: options.quality || 0.8,
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Render a single frame showing code with highlighted line and variables
  private renderFrame(
    code: string,
    step: TraceStep,
    stepIndex: number,
    totalSteps: number,
    isDark: boolean,
  ): ImageData {
    const ctx = this.ctx;
    const { width, height } = this.options;

    // Background
    ctx.fillStyle = isDark ? '#0a0a0f' : '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = isDark ? '#1a1a2e' : '#f0f0f5';
    ctx.fillRect(0, 0, width, 50);

    // Title
    ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('CodeFlow', 20, 32);

    // Step indicator
    ctx.fillStyle = isDark ? '#888' : '#666';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Step ${stepIndex + 1} / ${totalSteps}`, width - 120, 32);

    // Code area
    const codeLines = code.split('\n');
    const lineHeight = 24;
    const codeStartY = 80;
    const codeStartX = 60;

    ctx.font = "14px 'JetBrains Mono', 'Fira Code', monospace";

    codeLines.forEach((line, index) => {
      const lineNum = index + 1;
      const y = codeStartY + index * lineHeight;

      // Line number
      ctx.fillStyle = isDark ? '#555' : '#999';
      ctx.fillText(String(lineNum).padStart(3, ' '), 15, y);

      // Highlight current line
      if (lineNum === step.line) {
        ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.1)';
        ctx.fillRect(50, y - 16, width - 70, lineHeight);

        // Line indicator
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(50, y - 16, 3, lineHeight);
      }

      // Code text
      ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
      ctx.fillText(line, codeStartX, y);
    });

    // Variables panel
    const varsStartY = codeStartY + codeLines.length * lineHeight + 30;
    const varsX = 20;

    ctx.fillStyle = isDark ? '#1a1a2e' : '#f0f0f5';
    ctx.roundRect(varsX, varsStartY - 10, width - 40, 150, 8);
    ctx.fill();

    ctx.fillStyle = isDark ? '#888' : '#666';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('VARIABLES', varsX + 15, varsStartY + 10);

    ctx.font = "13px 'JetBrains Mono', monospace";
    const varEntries = Object.entries(step.locals).slice(0, 5);
    varEntries.forEach(([key, value], index) => {
      const y = varsStartY + 35 + index * 22;

      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.fillText(key, varsX + 15, y);

      ctx.fillStyle = isDark ? '#888' : '#666';
      ctx.fillText(' = ', varsX + 15 + ctx.measureText(key).width, y);

      ctx.fillStyle = isDark ? '#e0e0e0' : '#333';
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      ctx.fillText(valueStr.slice(0, 40), varsX + 15 + ctx.measureText(key + ' = ').width, y);
    });

    // Progress bar at bottom
    ctx.fillStyle = isDark ? '#1a1a2e' : '#e0e0e5';
    ctx.fillRect(0, height - 8, width, 8);

    const progress = ((stepIndex + 1) / totalSteps) * width;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, height - 8, progress, 8);

    return ctx.getImageData(0, 0, width, height);
  }

  // Capture all frames from trace
  async captureFrames(
    code: string,
    trace: TraceStep[],
    isDark: boolean,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<void> {
    this.frames = [];

    for (let i = 0; i < trace.length; i++) {
      onProgress?.({
        stage: 'capturing',
        progress: Math.round((i / trace.length) * 100),
        message: `Capturing frame ${i + 1} of ${trace.length}...`,
      });

      const frame = this.renderFrame(code, trace[i], i, trace.length, isDark);
      this.frames.push(frame);

      // Small delay to allow UI updates
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  // Export to GIF using simple encoding
  async exportToGif(onProgress?: (progress: ExportProgress) => void): Promise<Blob> {
    onProgress?.({
      stage: 'encoding',
      progress: 0,
      message: 'Encoding GIF...',
    });

    // We'll create a simple animated GIF-like WebM since true GIF encoding
    // requires a complex library. For now, export as WebM which is more efficient.
    return this.exportToWebM(onProgress);
  }

  // Export to WebM video
  async exportToWebM(onProgress?: (progress: ExportProgress) => void): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(0);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000,
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Export complete!',
          });
          resolve(blob);
        };

        mediaRecorder.onerror = (e) => {
          reject(e);
        };

        mediaRecorder.start();

        // Draw each frame with delay
        let frameIndex = 0;
        const drawNextFrame = () => {
          if (frameIndex >= this.frames.length) {
            mediaRecorder.stop();
            return;
          }

          this.ctx.putImageData(this.frames[frameIndex], 0, 0);

          // Request a frame from the stream
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && 'requestFrame' in videoTrack) {
            (videoTrack as { requestFrame: () => void }).requestFrame();
          }

          onProgress?.({
            stage: 'encoding',
            progress: Math.round((frameIndex / this.frames.length) * 100),
            message: `Encoding frame ${frameIndex + 1} of ${this.frames.length}...`,
          });

          frameIndex++;
          setTimeout(drawNextFrame, this.options.frameDelay);
        };

        drawNextFrame();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Download the exported file
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Alternative: Generate a simple animated SVG
export function generateAnimatedSVG(code: string, trace: TraceStep[], isDark: boolean): string {
  const width = 800;
  const height = 600;
  const lineHeight = 24;
  const codeLines = code.split('\n');

  const bgColor = isDark ? '#0a0a0f' : '#fafafa';
  const textColor = isDark ? '#e0e0e0' : '#333';
  const highlightColor = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(56, 189, 248, 0.1)';

  // Generate keyframes for line highlight
  const keyframes = trace
    .map((step, index) => {
      const percent = (index / (trace.length - 1)) * 100;
      const y = 60 + (step.line - 1) * lineHeight;
      return `${percent.toFixed(1)}% { transform: translateY(${y}px); }`;
    })
    .join('\n    ');

  const duration = trace.length * 0.5; // 500ms per step

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <style>
    @keyframes moveHighlight {
    ${keyframes}
    }
    .highlight {
      animation: moveHighlight ${duration}s steps(${trace.length}) infinite;
    }
    .code-text { font-family: 'JetBrains Mono', monospace; font-size: 14px; }
    .line-num { fill: #888; }
  </style>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  
  <!-- Moving highlight -->
  <rect class="highlight" x="50" y="0" width="${width - 70}" height="${lineHeight}" fill="${highlightColor}"/>
  <rect class="highlight" x="50" y="0" width="3" height="${lineHeight}" fill="#38bdf8"/>
  
  <!-- Code lines -->
  ${codeLines
    .map(
      (line, i) => `
  <text class="line-num code-text" x="15" y="${80 + i * lineHeight}">${String(i + 1).padStart(3, ' ')}</text>
  <text class="code-text" x="60" y="${80 + i * lineHeight}" fill="${textColor}">${escapeXml(line)}</text>
  `,
    )
    .join('')}
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
