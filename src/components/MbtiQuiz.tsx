import { useEffect, useState } from 'react';
import type { MbtiQuestion, MbtiResult } from '../types';
import { fetchMbtiQuestions, submitMbti } from '../api';

interface Props {
  onClose: () => void;
}

// 四个维度的配色
const DIM_COLOR: Record<string, [string, string]> = {
  EI: ['#c0392b', '#4a7ba7'],
  SN: ['#c9a96a', '#3f7d5a'],
  TF: ['#4a7ba7', '#c0392b'],
  JP: ['#c9a96a', '#3f7d5a'],
};

function ScoreBar({ dim, letter, poleA, poleB, percentA }: { dim: string; letter: string; poleA: string; poleB: string; percentA: number }) {
  const [cA, cB] = DIM_COLOR[dim] ?? ['#c9a96a', '#4a7ba7'];
  const isA = letter === poleA;
  const width = isA ? percentA : 100 - percentA;
  const color = isA ? cA : cB;
  return (
    <div className="flex items-center gap-2">
      <span className="flex-none w-[22px] text-center text-[13px] font-medium" style={{ color: isA ? cA : '#a99c84' }}>
        {poleA}
      </span>
      <div className="flex-1 h-2 rounded-full bg-panel-2/60 overflow-hidden flex">
        <div style={{ width: `${percentA}%`, background: cA }} className="h-full" />
        <div style={{ width: `${100 - percentA}%`, background: cB }} className="h-full" />
      </div>
      <span className="flex-none w-[22px] text-center text-[13px] font-medium" style={{ color: !isA ? cB : '#a99c84' }}>
        {poleB}
      </span>
      <span className="flex-none w-[52px] text-right text-[12px]" style={{ color }}>
        {width}%
      </span>
    </div>
  );
}

export function MbtiQuiz({ onClose }: Props) {
  const [questions, setQuestions] = useState<MbtiQuestion[]>([]);
  const [answers, setAnswers] = useState<(0 | 1 | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<MbtiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchMbtiQuestions()
      .then((qs) => {
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
      })
      .catch((e) => setErr(e.message || '题库加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const answer = (v: 0 | 1) => {
    const next = [...answers];
    next[idx] = v;
    setAnswers(next);
    if (idx < questions.length - 1) setIdx(idx + 1);
  };

  const answeredCount = answers.filter((a) => a !== null).length;
  const allDone = questions.length > 0 && answeredCount === questions.length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await submitMbti(answers);
      setResult(r);
    } catch (e: any) {
      setErr(e.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[idx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.72)] backdrop-blur-sm">
      <div className="modal pop-in w-full max-w-[560px] max-h-[92vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line sticky top-0 bg-panel z-10">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">MBTI 性格测评</h3>
          <button className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="p-[18px]">
          {loading && <div className="text-center text-fg-dim py-10">正在准备题目…</div>}
          {err && !result && <p className="text-[13px] text-vermilion m-0">{err}</p>}

          {/* 结果页 */}
          {result && (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <div className="text-[11px] text-fg-faint tracking-[3px] mb-1">你的类型</div>
                <div className="font-brush text-[34px] text-gold-bright tracking-[3px] leading-none">
                  {result.code}
                </div>
                <div className="text-[15px] text-gold mt-2">
                  {result.type.name}
                  {result.type.alias && <span className="text-fg-dim text-[13px] ml-2">（{result.type.alias}）</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-line bg-panel-2/40">
                {result.dimensions.map((d) => (
                  <ScoreBar
                    key={d.dim}
                    dim={d.dim}
                    letter={d.letter}
                    poleA={d.poleA}
                    poleB={d.poleB}
                    percentA={d.percentA}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2 text-[13px] leading-relaxed">
                <div className="text-[11px] text-fg-faint tracking-[1px]">各维度倾向</div>
                {result.dimensions.map((d) => (
                  <div key={d.dim} className="text-fg-dim">
                    <span className="text-fg">{d.label.split('（')[0]}</span>
                    <span className="ml-2">{d.letter}</span>
                    <span className="text-fg-faint text-[12px] ml-2">
                      {d.poleA} {d.scoreA} 票 · {d.poleB} {d.scoreB} 票
                    </span>
                  </div>
                ))}
              </div>

              {result.type.strengths && (
                <div className="p-3.5 rounded-xl border border-[rgba(63,125,90,0.4)] bg-[rgba(63,125,90,0.1)] text-[13px] leading-relaxed">
                  <div className="text-[11px] text-[#3f7d5a] tracking-[1px] mb-1">核心优势</div>
                  <div className="text-fg">{result.type.strengths}</div>
                </div>
              )}
              {result.type.watchouts && (
                <div className="p-3.5 rounded-xl border border-[rgba(192,57,43,0.4)] bg-[rgba(192,57,43,0.1)] text-[13px] leading-relaxed">
                  <div className="text-[11px] text-vermilion tracking-[1px] mb-1">需留意</div>
                  <div className="text-fg">{result.type.watchouts}</div>
                </div>
              )}

              <div className="flex justify-center gap-2.5 pt-1">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setResult(null);
                    setIdx(0);
                    setAnswers(new Array(questions.length).fill(null));
                  }}
                >
                  重新测评
                </button>
                <button className="btn btn-primary btn-sm" onClick={onClose}>
                  完成
                </button>
              </div>
            </div>
          )}

          {/* 答题页 */}
          {!loading && !result && q && (
            <div className="flex flex-col gap-4">
              {/* 进度 */}
              <div>
                <div className="flex items-center justify-between text-[12px] text-fg-dim mb-1.5">
                  <span>
                    第 {idx + 1} / {questions.length} 题
                  </span>
                  <span>已答 {answeredCount} 题</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel-2/60 overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 题目 */}
              <div className="py-2">
                <div className="text-[11px] text-fg-faint tracking-[2px] mb-2">
                  {q.dim === 'EI' ? '能量方向' : q.dim === 'SN' ? '信息获取' : q.dim === 'TF' ? '决策方式' : '生活态度'}
                </div>
                <div className="font-serif text-[17px] text-fg leading-relaxed">{q.text}</div>
              </div>

              {/* 选项 */}
              <div className="flex flex-col gap-2.5">
                {([0, 1] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={
                      'text-left rounded-xl p-3.5 border transition text-[14px] leading-snug ' +
                      (answers[idx] === v
                        ? 'border-gold bg-gold-dim/25 text-gold-bright'
                        : 'border-gold-dim bg-panel-2/40 text-fg hover:border-gold')
                    }
                    onClick={() => answer(v)}
                  >
                    <span className="text-gold mr-2">{v === 0 ? 'A' : 'B'}</span>
                    {v === 0 ? q.a : q.b}
                  </button>
                ))}
              </div>

              {/* 导航 */}
              <div className="flex items-center justify-between pt-1">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                >
                  ← 上一题
                </button>
                {idx < questions.length - 1 ? (
                  <button className="btn btn-ghost btn-sm" disabled={answers[idx] === null} onClick={() => setIdx((i) => i + 1)}>
                    下一题 →
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" disabled={!allDone || submitting} onClick={submit}>
                    {submitting ? '计算中…' : allDone ? '查看结果' : `还有 ${questions.length - answeredCount} 题未答`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
