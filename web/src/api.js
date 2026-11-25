const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
  : "";

function stableNumber(seed, low, high) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = hash >>> 0;
  return low + (positive % (high - low + 1));
}

function diagnose(metrics) {
  if (metrics.transcript_accuracy < 85) {
    return {
      stage: "asr",
      severity: "high",
      summary: "Transcript quality is the primary reliability bottleneck.",
      recommendation:
        "Review the ASR provider, microphone quality, and noise handling before tuning the LLM.",
    };
  }
  if (metrics.end_of_turn_ms > 650) {
    return {
      stage: "vad",
      severity: "medium",
      summary:
        "Turn completion is detected too slowly, making the agent feel unresponsive.",
      recommendation:
        "Reduce silence thresholds or compare an alternate VAD configuration.",
    };
  }
  if (!metrics.task_success) {
    return {
      stage: "llm",
      severity: "high",
      summary:
        "Speech recognition is usable, but the downstream agent did not complete the intended task.",
      recommendation:
        "Inspect the prompt, tool-selection trace, and task-verification logic.",
    };
  }
  return {
    stage: "none",
    severity: "low",
    summary: "No dominant reliability failure was detected in this run.",
    recommendation:
      "Keep this stack as a baseline and monitor regressions across new audio conditions.",
  };
}

function runLocalDemo(payload) {
  const results = payload.pipelines.map((pipeline) => {
    const seed = `${payload.conversation_id}|${pipeline.id}`;
    const metrics = {
      pipeline_id: pipeline.id,
      transcript_accuracy: stableNumber(seed + "|asr", 82, 99),
      end_of_turn_ms: stableNumber(seed + "|vad", 180, 820),
      response_latency_ms: stableNumber(seed + "|latency", 420, 1900),
      interruption_score: stableNumber(seed + "|interrupt", 75, 99),
      task_success: stableNumber(seed + "|task", 0, 9) > 1,
      estimated_cost_usd:
        Math.round(stableNumber(seed + "|cost", 9, 38)) / 1000,
    };

    return {
      pipeline,
      metrics,
      diagnostic: diagnose(metrics),
    };
  });

  results.sort((a, b) => {
    if (a.metrics.task_success !== b.metrics.task_success) {
      return a.metrics.task_success ? -1 : 1;
    }
    if (a.metrics.transcript_accuracy !== b.metrics.transcript_accuracy) {
      return b.metrics.transcript_accuracy - a.metrics.transcript_accuracy;
    }
    return a.metrics.response_latency_ms - b.metrics.response_latency_ms;
  });

  return Promise.resolve({
    conversation_id: payload.conversation_id,
    results,
    mode: "browser-demo",
  });
}

export async function runBenchmark(payload) {
  if (!API_BASE_URL) {
    return runLocalDemo(payload);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/benchmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "Benchmark request failed");
    }
    return data;
  } catch (error) {
    console.warn("Auri API unavailable; using browser demo mode.", error);
    return runLocalDemo(payload);
  }
}
