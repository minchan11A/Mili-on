/**
 * 상용 AI 공급자 (서버 전용). 이 파일은 API 라우트와 스크립트에서만 import합니다.
 * 들어오는 텍스트는 모두 maskText를 거친 것이어야 합니다 (flow.ts가 보장).
 *
 * - claude: 공식 SDK(@anthropic-ai/sdk) + 구조화 출력(zod 스키마)
 * - gemini / openai: REST 호출 + JSON 모드 (키와 모델은 환경변수)
 * zod 검증이 실패하면 1회 재시도하고, 또 실패하면 SolutionGenerationError를 던집니다.
 */
import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { Solution } from '../types';
import {
  QNA_SYSTEM, SOLUTION_SYSTEM, SUMMARY_SYSTEM, buildQnaPrompt, buildSolutionPrompt, buildSummaryPrompt,
} from './prompts';
import { SolutionSchema, parseSolutionText, validateSolution } from './schema';
import { SolutionGenerationError, type LlmProvider, type QnaAnswer, type QnaInput } from './types';

export type CommercialName = 'claude' | 'gemini' | 'openai';

const DEFAULT_MODEL: Record<CommercialName, string> = {
  claude: 'claude-opus-5-5',
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4.1-mini',
};

function parseQna(text: string): QnaAnswer | null {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try {
    const j = JSON.parse(text.slice(s, e + 1)) as { body?: unknown; sourceGuideIds?: unknown };
    if (typeof j.body !== 'string') return null;
    const ids = Array.isArray(j.sourceGuideIds) ? j.sourceGuideIds.filter((x): x is string => typeof x === 'string') : [];
    return { body: j.body, sourceGuideIds: ids };
  } catch { return null; }
}

/** 근거 가이드가 없는 답변은 쓰지 않음 (명세 §6.6) */
function keepGrounded(a: QnaAnswer | null, input: QnaInput): QnaAnswer | null {
  if (!a) return null;
  const allowed = new Set(input.guides.map((g) => g.id));
  const ids = a.sourceGuideIds.filter((id) => allowed.has(id));
  return ids.length ? { body: a.body, sourceGuideIds: ids } : null;
}

/* ───────────────────────── Claude ───────────────────────── */

function claudeProvider(apiKey: string, model: string): LlmProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });

  async function text(system: string, user: string, maxTokens = 4000): Promise<string> {
    const res = await client.beta.messages.create({
      model, max_tokens: maxTokens, system,
      output_config: { effort: 'low' },
      // 정책 거절 시 서버가 알맞은 모델로 다시 실행 (server-side fallback)
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{ role: 'user', content: user }],
    });
    if (res.stop_reason === 'refusal') throw new SolutionGenerationError('AI가 요청을 거절했습니다');
    return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  }

  return {
    name: 'commercial:claude',
    async generateSolution(input) {
      const user = buildSolutionPrompt(input);
      let lastError = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await client.beta.messages.parse({
            model, max_tokens: 16000, system: SOLUTION_SYSTEM,
            output_config: { effort: 'medium', format: betaZodOutputFormat(SolutionSchema) },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            messages: [{ role: 'user', content: user }],
          });
          if (res.stop_reason === 'refusal') throw new SolutionGenerationError('AI가 요청을 거절했습니다');
          const v = validateSolution(res.parsed_output);
          if (v.ok) return v.value;
          lastError = v.error;
        } catch (e) {
          if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw e;
          if (e instanceof SolutionGenerationError) throw e;
          lastError = (e as Error).message;
        }
      }
      throw new SolutionGenerationError(`AI 초안 생성 실패: ${lastError}`);
    },
    async summarizeIssue(input) {
      return text(SUMMARY_SYSTEM, buildSummaryPrompt(input), 1000);
    },
    async answerQuestion(input) {
      return keepGrounded(parseQna(await text(QNA_SYSTEM, buildQnaPrompt(input), 1500)), input);
    },
  };
}

/* ───────────────────────── Gemini / OpenAI (REST) ───────────────────────── */

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new SolutionGenerationError(`AI API 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function restProvider(name: 'gemini' | 'openai', apiKey: string, model: string): LlmProvider {
  async function complete(system: string, user: string, json: boolean): Promise<string> {
    if (name === 'gemini') {
      const data = (await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': apiKey },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: json ? { responseMimeType: 'application/json' } : {},
        },
      )) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    }
    const data = (await postJson('https://api.openai.com/v1/chat/completions', { authorization: `Bearer ${apiKey}` }, {
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    })) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  }

  return {
    name: `commercial:${name}`,
    async generateSolution(input) {
      const user = buildSolutionPrompt(input);
      let lastError = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = parseSolutionText(await complete(SOLUTION_SYSTEM, user, true));
        if (r.ok) return r.value as Solution;
        lastError = r.error;
      }
      throw new SolutionGenerationError(`AI 초안 생성 실패: ${lastError}`);
    },
    async summarizeIssue(input) {
      return (await complete(SUMMARY_SYSTEM, buildSummaryPrompt(input), false)).trim();
    },
    async answerQuestion(input) {
      return keepGrounded(parseQna(await complete(QNA_SYSTEM, buildQnaPrompt(input), true)), input);
    },
  };
}

export function createCommercialProvider(name: CommercialName, apiKey: string, model?: string): LlmProvider {
  const m = model || DEFAULT_MODEL[name];
  return name === 'claude' ? claudeProvider(apiKey, m) : restProvider(name, apiKey, m);
}
