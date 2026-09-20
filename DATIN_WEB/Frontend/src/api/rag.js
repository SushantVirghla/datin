import { AUTH_BASE_URL } from './config';

/**
 * Check if the Python RAG / AI backend is reachable (via proxy).
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/rag-proxy/health`, {
      method: 'GET',
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Stream a query from the Python RAG / AI backend via the Node.js proxy.
 * The proxy forwards to the PC backend without auth headers.
 * Calls onChunk(accumulatedText, newChunk) as tokens arrive in real-time.
 * Returns the final complete text response.
 */
export async function sendQueryStream(query, onChunk, signal) {
  // Route through the Node.js proxy at localhost:3001/rag-proxy/*
  // This bypasses the PC backend's JWT auth requirement
  const proxyStreamUrl = `${AUTH_BASE_URL}/rag-proxy/query-stream`;
  const proxyQueryUrl = `${AUTH_BASE_URL}/rag-proxy/query`;

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('datinToken') || localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;

  // Try streaming endpoint first
  try {
    console.log(`[DATIN RAG] POST ${proxyStreamUrl}`);
    response = await fetch(proxyStreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
      signal,
    });
  } catch (netErr) {
    const err = new Error(netErr.message || 'Failed to connect to DATIN RAG server');
    err.code = 'ERR_CONNECTION_REFUSED';
    err.detail = netErr.message;
    throw err;
  }

  // Fallback to non-streaming if stream returns 404 or 502
  if (response.status === 404 || response.status === 502) {
    try {
      console.log(`[DATIN RAG] Stream unavailable, falling back to ${proxyQueryUrl}`);
      response = await fetch(proxyQueryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal,
      });
    } catch (netErr) {
      const err = new Error(netErr.message || 'Failed to connect to DATIN RAG server');
      err.code = 'ERR_CONNECTION_REFUSED';
      err.detail = netErr.message;
      throw err;
    }
  }

  if (!response.ok) {
    let errDetail = '';
    try {
      const errData = await response.json();
      errDetail = typeof errData.detail === 'string'
        ? errData.detail
        : JSON.stringify(errData.detail || errData);
    } catch {
      errDetail = response.statusText || `HTTP ${response.status}`;
    }
    const error = new Error(errDetail || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = `HTTP_${response.status}`;
    error.detail = errDetail;
    throw error;
  }

  // Handle streaming response via ReadableStream
  if (response.body && response.body.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      accumulatedText += chunk;
      if (onChunk) {
        onChunk(accumulatedText, chunk);
      }
    }

    // Handle JSON response from non-streaming endpoint
    if (accumulatedText.trim().startsWith('{') && accumulatedText.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(accumulatedText);
        if (parsed.message?.query_resp) return parsed.message.query_resp;
        if (typeof parsed.message === 'string') return parsed.message;
      } catch {
        // use raw text
      }
    }

    return accumulatedText;
  }

  // Non-streaming fallback (no ReadableStream support)
  const text = await response.text();
  if (onChunk) onChunk(text, text);
  return text;
}

/**
 * Non-streaming query helper (compatible with existing code).
 */
export async function sendQuery(query) {
  return await sendQueryStream(query);
}
