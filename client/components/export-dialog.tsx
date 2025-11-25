'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Download, Video, FileImage, Loader2, Check, Film } from 'lucide-react';
import { TraceStep } from '@/lib/types';
import { ExecutionExporter, ExportProgress, generateAnimatedSVG } from '@/lib/video-exporter';
import { useTheme } from 'next-themes';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  trace: TraceStep[];
}

type ExportFormat = 'webm' | 'svg';

export function ExportDialog({ isOpen, onClose, code, trace }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('webm');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const handleExport = useCallback(async () => {
    if (trace.length === 0) {
      setError('No execution trace to export. Run your code first.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress({ stage: 'preparing', progress: 0, message: 'Preparing export...' });

    try {
      if (selectedFormat === 'svg') {
        // Generate animated SVG
        setProgress({ stage: 'encoding', progress: 50, message: 'Generating SVG...' });
        const svg = generateAnimatedSVG(code, trace, isDark);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        ExecutionExporter.downloadBlob(blob, `codeflow-animation.svg`);
        setProgress({ stage: 'complete', progress: 100, message: 'Export complete!' });
      } else {
        // Export to WebM video
        const exporter = new ExecutionExporter({
          format: 'webm',
          frameDelay: 500,
          width: 800,
          height: 600,
        });

        await exporter.captureFrames(code, trace, isDark, setProgress);
        const blob = await exporter.exportToWebM(setProgress);
        ExecutionExporter.downloadBlob(blob, `codeflow-animation.webm`);
      }

      // Auto-close after success
      setTimeout(() => {
        setIsExporting(false);
        setProgress(null);
      }, 1500);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
      setProgress(null);
    }
  }, [code, trace, selectedFormat, isDark]);

  const handleClose = () => {
    if (!isExporting) {
      setProgress(null);
      setError(null);
      onClose();
    }
  };

  const formats: { id: ExportFormat; name: string; icon: React.ReactNode; description: string }[] =
    [
      {
        id: 'webm',
        name: 'WebM Video',
        icon: <Video className="h-5 w-5" />,
        description: 'High quality video, plays in browsers',
      },
      {
        id: 'svg',
        name: 'Animated SVG',
        icon: <FileImage className="h-5 w-5" />,
        description: 'Lightweight, scalable animation',
      },
    ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="bg-card border-border overflow-hidden rounded-2xl border shadow-2xl">
              {/* Header */}
              <div className="border-border/50 flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                    <Film className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Export Animation</h2>
                    <p className="text-muted-foreground text-xs">Save execution as video</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full"
                  disabled={isExporting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-4 p-6">
                {!isExporting && !progress?.stage?.includes('complete') ? (
                  <>
                    {/* Format Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Export Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        {formats.map((format) => (
                          <button
                            key={format.id}
                            onClick={() => setSelectedFormat(format.id)}
                            className={`rounded-xl border-2 p-3 text-left transition-all ${
                              selectedFormat === format.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border/50 hover:border-border'
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <div
                                className={
                                  selectedFormat === format.id
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                }
                              >
                                {format.icon}
                              </div>
                              <span className="text-sm font-medium">{format.name}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px]">
                              {format.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-muted/30 border-border/50 flex items-center gap-2 rounded-lg border p-3 text-xs">
                      <div className="flex-1">
                        <p className="text-muted-foreground">Frames to export</p>
                        <p className="font-medium">{trace.length} steps</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">~{(trace.length * 0.5).toFixed(1)}s</p>
                      </div>
                    </div>

                    {error && (
                      <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>
                    )}

                    <Button onClick={handleExport} className="w-full" disabled={trace.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Export {selectedFormat.toUpperCase()}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4 py-8">
                    {progress?.stage === 'complete' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                          <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="text-sm font-medium">Export Complete!</p>
                        <p className="text-muted-foreground text-xs">
                          Your file has been downloaded
                        </p>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                          className="bg-primary/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                        >
                          <Loader2 className="text-primary h-8 w-8" />
                        </motion.div>
                        <p className="mb-2 text-sm font-medium">
                          {progress?.message || 'Processing...'}
                        </p>

                        {/* Progress bar */}
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <motion.div
                            className="bg-primary h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress?.progress || 0}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {progress?.progress || 0}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
