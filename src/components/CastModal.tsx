import { useState } from 'react';
import type { CastRequest, CastMethod } from '../types';
import { CAST_META, type CastMethodKey } from '../castCategories';

export type CastType = CastMethodKey;

interface Props {
  type: CastType;
  onClose: () => void;
  onSubmit: (cast: CastRequest) => void;
}

const DIRECTIONS: { key: string; name: string; label: string }[] = [
  { key: 'qian', name: '乾', label: '西北' },
  { key: 'dui', name: '兑', label: '西' },
  { key: 'li', name: '离', label: '南' },
  { key: 'zhen', name: '震', label: '东' },
  { key: 'xun', name: '巽', label: '东南' },
  { key: 'kan', name: '坎', label: '北' },
  { key: 'gen', name: '艮', label: '东北' },
  { key: 'kun', name: '坤', label: '西南' },
];

const NAJIA_BASES: { key: CastMethod; name: string }[] = [
  { key: 'coin', name: '铜钱' },
  { key: 'number', name: '数字' },
  { key: 'time', name: '时间' },
  { key: 'char', name: '汉字' },
  { key: 'direction', name: '方位' },
];

function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function CastModal({ type, onClose, onSubmit }: Props) {
  const [a, setA] = useState('8');
  const [b, setB] = useState('3');
  const [time, setTime] = useState(nowLocalInput());
  const [chars, setChars] = useState('');
  const [dir, setDir] = useState('');
  const [soundCount, setSoundCount] = useState('');
  const [soundSent, setSoundSent] = useState('');
  const [reportA, setReportA] = useState('');
  const [reportB, setReportB] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [question, setQuestion] = useState('');
  const [err, setErr] = useState('');
  const [base, setBase] = useState<CastMethod>('coin');

  const q = question.trim() || undefined;
  const meta = CAST_META[type];

  const submit = () => {
    if (type === 'time') {
      if (!time) {
        setErr('请选择时间');
        return;
      }
      const ts = new Date(time).getTime();
      if (!Number.isFinite(ts)) {
        setErr('时间格式有误');
        return;
      }
      onSubmit({ method: 'time', timestamp: ts, question: q });
    } else if (type === 'char') {
      const text = chars.trim();
      if (!text) {
        setErr('请填写至少一个汉字');
        return;
      }
      onSubmit({ method: 'char', chars: text, question: q });
    } else if (type === 'direction') {
      if (!dir) {
        setErr('请选择一个方位');
        return;
      }
      onSubmit({ method: 'direction', direction: dir, question: q });
    } else if (type === 'sound') {
      const sc = parseInt(soundCount, 10);
      const ss = parseInt(soundSent, 10);
      if (!Number.isFinite(sc) || !Number.isFinite(ss) || sc <= 0 || ss <= 0) {
        setErr('请填写大于 0 的整数');
        return;
      }
      onSubmit({ method: 'sound', sound: { count: sc, sentences: ss }, question: q });
    } else if (type === 'report') {
      const ra = parseInt(reportA, 10);
      if (!Number.isFinite(ra) || ra <= 0) {
        setErr('请填写至少一个大于 0 的数字');
        return;
      }
      const rb = parseInt(reportB, 10);
      const nums = Number.isFinite(rb) && rb > 0 ? [ra, rb] : [ra];
      onSubmit({ method: 'report', numbers: nums, question: q });
    } else if (type === 'number') {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!Number.isFinite(na) || !Number.isFinite(nb) || na <= 0 || nb <= 0) {
        setErr('请输入大于 0 的整数');
        return;
      }
      onSubmit({ method: 'number', numbers: [na, nb], question: q });
    } else if (type === 'person') {
      const nm = name.trim();
      if (!nm) {
        setErr('请填写姓名');
        return;
      }
      if (!birthday) {
        setErr('请选择生日');
        return;
      }
      onSubmit({ method: 'person', name: nm, birthday, gender, question: q });
    } else if (type === 'coin') {
      onSubmit({ method: 'coin', question: q });
    } else if (type === 'yarrow') {
      onSubmit({ method: 'yarrow', question: q });
    } else {
      // 纳甲六爻：以所选基础法起卦，并附带排盘
      const baseReq: CastRequest = { method: base, najia: true };
      if (base === 'time') {
        if (!time) {
          setErr('请选择时间');
          return;
        }
        const ts = new Date(time).getTime();
        if (!Number.isFinite(ts)) {
          setErr('时间格式有误');
          return;
        }
        baseReq.timestamp = ts;
      } else if (base === 'char') {
        const t = chars.trim();
        if (!t) {
          setErr('请填写至少一个汉字');
          return;
        }
        baseReq.chars = t;
      } else if (base === 'direction') {
        if (!dir) {
          setErr('请选择一个方位');
          return;
        }
        baseReq.direction = dir;
      } else if (base === 'number') {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isFinite(na) || !Number.isFinite(nb) || na <= 0 || nb <= 0) {
          setErr('请输入大于 0 的整数');
          return;
        }
        baseReq.numbers = [na, nb];
      }
      baseReq.question = q;
      onSubmit(baseReq);
    }
  };

  // 渲染基础起卦法（数字/时间/汉字/方位）的输入区；铜钱法无需输入
  const inputsFor = (m: string) => {
    if (m === 'number') {
      return (
        <div className="flex gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            第一个数（定上卦）
            <input
              className="field"
              value={a}
              onChange={(e) => setA(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            第二个数（定下卦）
            <input
              className="field"
              value={b}
              onChange={(e) => setB(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
      );
    }
    if (m === 'time') {
      return (
        <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
          所占之时辰
          <input
            type="datetime-local"
            className="bg-ink-2 border border-gold-dim rounded-lg px-3 py-2.5 text-fg font-serif text-[15px] outline-none focus:border-gold"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      );
    }
    if (m === 'char') {
      return (
        <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
          所起之字
          <input
            className="bg-ink-2 border border-gold-dim rounded-lg px-3 py-2.5 text-fg font-serif text-[15px] outline-none focus:border-gold"
            value={chars}
            onChange={(e) => setChars(e.target.value)}
            placeholder="如：问道 / 前程似锦 / 此时心意"
            maxLength={20}
          />
        </label>
      );
    }
    if (m === 'direction') {
      return (
        <div className="grid grid-cols-4 gap-2.5">
          {DIRECTIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              className={
                'flex flex-col items-center gap-1 py-3 bg-panel-2/60 border rounded-xl cursor-pointer transition ' +
                (dir === d.key
                  ? 'border-gold-bright shadow-[inset_0_0_0_1px_#e7cd95] bg-gradient-to-b from-[rgba(201,169,106,0.22)] to-[rgba(201,169,106,0.1)]'
                  : 'border-gold-dim hover:border-gold')
              }
              onClick={() => setDir(d.key)}
            >
              <span className="font-brush text-xl text-gold-bright leading-none">{d.name}</span>
              <span className="text-xs text-fg-dim">{d.label}</span>
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="modal pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">{meta.title}</h3>
          <button className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-3.5">
          {type === 'sound' && (
            <div className="flex flex-col gap-3.5 mb-1">
              <div className="sound-counter">
                <span className="block text-[13px] text-fg-dim mb-2">所闻声数（定上卦）</span>
                <div className="flex items-stretch gap-2.5">
                  <button
                    type="button"
                    className="sound-step"
                    onClick={() =>
                      setSoundCount((v) => String(Math.max(0, (parseInt(v, 10) || 0) - 1)))
                    }
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="sound-tap"
                    onClick={() => setSoundCount((v) => String((parseInt(v, 10) || 0) + 1))}
                  >
                    <span className="sound-num">{parseInt(soundCount, 10) || 0}</span>
                    <span className="sound-tap-hint">听一声 点一下</span>
                  </button>
                  <button
                    type="button"
                    className="sound-step"
                    onClick={() => setSoundCount((v) => String((parseInt(v, 10) || 0) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="sound-counter">
                <span className="block text-[13px] text-fg-dim mb-2">所言句数（定下卦）</span>
                <div className="flex items-stretch gap-2.5">
                  <button
                    type="button"
                    className="sound-step"
                    onClick={() =>
                      setSoundSent((v) => String(Math.max(0, (parseInt(v, 10) || 0) - 1)))
                    }
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="sound-tap"
                    onClick={() => setSoundSent((v) => String((parseInt(v, 10) || 0) + 1))}
                  >
                    <span className="sound-num">{parseInt(soundSent, 10) || 0}</span>
                    <span className="sound-tap-hint">闻一句 点一下</span>
                  </button>
                  <button
                    type="button"
                    className="sound-step"
                    onClick={() => setSoundSent((v) => String((parseInt(v, 10) || 0) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="sound-reset"
                onClick={() => {
                  setSoundCount('0');
                  setSoundSent('0');
                }}
              >
                清零重数
              </button>
            </div>
          )}

          {type === 'report' && (
            <div className="flex gap-3">
              <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
                所报之数（必填）
                <input
                  className="field"
                  value={reportA}
                  onChange={(e) => setReportA(e.target.value)}
                  inputMode="numeric"
                  placeholder="如 7"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
                第二个数（可选）
                <input
                  className="field"
                  value={reportB}
                  onChange={(e) => setReportB(e.target.value)}
                  inputMode="numeric"
                  placeholder="留空则单数字起卦"
                />
              </label>
            </div>
          )}

          {type === 'person' && (
            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
                姓名
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如：张三 / 李慕白"
                  maxLength={20}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
                生日（公历）
                <input
                  type="date"
                  className="bg-ink-2 border border-gold-dim rounded-lg px-3 py-2.5 text-fg font-serif text-[15px] outline-none focus:border-gold"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </label>
              <div className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
                性别
                <div className="flex gap-2.5">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={
                        'btn btn-ghost btn-sm flex-1 ' +
                        (gender === g ? 'border-gold bg-gold-dim/30 text-gold-bright' : 'text-fg-dim')
                      }
                      onClick={() => setGender(g)}
                    >
                      {g === 'male' ? '男' : '女'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'yarrow' && (
            <p className="modal-note">
              以五十策、分二挂一、揲四归奇，三变成一爻，十八变成一卦。点击下方「起卦」即由系统依古法演算，无需填数。
            </p>
          )}

          {type === 'najia' && (
            <>
              <div className="mb-3">
                <span className="block text-[13px] text-fg-dim mb-2">基础起卦法</span>
                <div className="flex flex-wrap gap-2">
                  {NAJIA_BASES.map((bt) => (
                  <button
                    key={bt.key}
                    type="button"
                    className={
                      'btn btn-ghost btn-sm ' +
                      (base === bt.key ? 'border-gold bg-gold-dim/30 text-gold-bright' : 'text-fg-dim')
                    }
                    onClick={() => setBase(bt.key)}
                  >
                    {bt.name}
                  </button>
                  ))}
                </div>
              </div>
              {inputsFor(base)}
              {base !== 'coin' && (
                <p className="modal-hint">{CAST_META[base].hint}</p>
              )}
            </>
          )}

          {type !== 'sound' &&
            type !== 'report' &&
            type !== 'yarrow' &&
            type !== 'najia' &&
            type !== 'coin' &&
            inputsFor(type)}

          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            所问之事（可选）
            <input
              className="field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="如：此事可否成？"
            />
          </label>

          <p className="modal-hint">{meta.hint}</p>
          {err && <p className="text-[13px] text-vermilion m-0">{err}</p>}
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
          >
            起卦
          </button>
        </div>
      </div>
    </div>
  );
}
