import { RunResponse } from './types';

const isTauri = () => typeof window !== 'undefined' && '__TAURI__' in window;

const getBackendUrl = () => {
  if (isTauri()) {
    return localStorage.getItem('backend_url') || 'http://localhost:8000';
  }
  return '';
};

export async function runCode(
  code: string,
  language: string,
  input?: string,
): Promise<RunResponse> {
  const apiKey = localStorage.getItem('anthropic_api_key');
  const backendUrl = getBackendUrl();

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const url = isTauri() ? `${backendUrl}/run` : '/api/run';

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, language, input }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to run code');
  }

  return response.json();
}

export async function explainCode(
  code: string,
  trace: unknown[],
  onChunk: (text: string) => void,
): Promise<void> {
  const apiKey = localStorage.getItem('anthropic_api_key');
  const backendUrl = getBackendUrl();

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const url = isTauri() ? `${backendUrl}/explain` : '/api/explain';

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, trace }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Failed to explain code');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    onChunk(text);
  }
}
