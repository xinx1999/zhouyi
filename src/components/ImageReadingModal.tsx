import { useRef, useState } from 'react';
import type { ImageInput } from '../types';

// 面相 / 手相共用的图片上传弹窗
// 前端先做压缩（最长边 ≤ 1024、JPEG 质量 0.85），避免几 MB 的原图直传

const MAX_SIDE = 1024;
const QUALITY = 0.85;
// 与后端一致的上限（base64 字符数）；压缩后通常远低于此
const MAX_B64 = 8 * 1024 * 1024;

interface Props {
  kind: 'face' | 'palm';
  onClose: () => void;
  onSubmit: (input: ImageInput) => void;
}

const META = {
  face: {
    title: '面相',
    icon: '相',
    hint: '面相以三停五岳、五官气色为纲。请上传一张正面免冠、光线均匀、面部清晰的照片。',
    tips: [
      '正面免冠、五官完整入镜',
      '光线均匀，避免逆光或浓重阴影',
      '不戴墨镜/口罩，少用美颜滤镜',
      '单人清晰照，避免合照裁切',
    ],
    placeholder: '可补充说明（如想问事业、感情等）',
  },
  palm: {
    title: '手相',
    icon: '掌',
    hint: '手相以掌形、掌丘与三大主线为纲。请上传一张手掌平摊、纹路清晰的照片。',
    tips: [
      '手掌平摊、五指自然张开',
      '光线充足，避免反光与阴影',
      '镜头正对手掌，尽量填满画面',
      '建议拍惯用手（左右手可各拍一张）',
    ],
    placeholder: '可补充说明（如想问事业、感情等）',
  },
} as const;

// 读取文件 → 压缩 → 返回 base64（不含 data: 前缀）
async function compressImage(file: File): Promise<ImageInput> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('读取图片失败'));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('图片解码失败，请换一张'));
    im.src = dataUrl;
  });

  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // 降级：无法压缩时直接用原图（并校验体积）
    const comma = dataUrl.indexOf(',');
    const b64 = comma > 0 ? dataUrl.slice(comma + 1) : '';
    if (!b64) throw new Error('图片处理失败，请换一张');
    if (b64.length > MAX_B64) throw new Error('图片过大，请先裁剪或压缩后再上传');
    return { imageBase64: b64, mimeType: file.type || 'image/jpeg' };
  }
  ctx.drawImage(img, 0, 0, w, h);

  let out = canvas.toDataURL('image/jpeg', QUALITY);
  let b64 = out.slice(out.indexOf(',') + 1);
  // 极端情况下仍偏大 → 逐档降质重压
  for (const q of [0.7, 0.55, 0.4]) {
    if (b64.length <= MAX_B64) break;
    out = canvas.toDataURL('image/jpeg', q);
    b64 = out.slice(out.indexOf(',') + 1);
  }
  if (!b64) throw new Error('图片处理失败，请换一张');
  if (b64.length > MAX_B64) throw new Error('图片过大，请先裁剪或压缩后再上传');
  return { imageBase64: b64, mimeType: 'image/jpeg' };
}

export function ImageReadingModal({ kind, onClose, onSubmit }: Props) {
  const meta = META[kind];
  const [preview, setPreview] = useState('');
  const [image, setImage] = useState<ImageInput | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    if (!f.type.startsWith('image/')) {
      setErr('请选择图片文件（jpg / png / webp）');
      return;
    }
    setBusy(true);
    try {
      const img = await compressImage(f);
      setImage(img);
      setPreview(`data:${img.mimeType};base64,${img.imageBase64}`);
    } catch (e: any) {
      setErr(e?.message || '图片处理失败');
      setImage(null);
      setPreview('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[18px] bg-[rgba(10,8,6,0.66)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-line">
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">{meta.title}</h3>
          <button
            className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="p-[18px] flex flex-col gap-3.5 max-h-[64vh] overflow-y-auto">
          {/* 上传区 */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gold-dim bg-panel-2/40 p-4 cursor-pointer transition hover:border-gold hover:bg-gold-dim/15"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={meta.title}
                  className="max-h-[220px] max-w-full rounded-lg border border-gold-dim/50"
                />
              ) : (
                <>
                  <span className="flex-none w-11 h-11 rounded-lg bg-vermilion text-[#fbe9d6] font-brush text-2xl flex items-center justify-center">
                    {meta.icon}
                  </span>
                  <span className="text-[13px] text-fg-dim">
                    {busy ? '处理中…' : '点击选择照片'}
                  </span>
                </>
              )}
            </button>
            {preview && (
              <button
                type="button"
                className="btn btn-ghost btn-sm self-start"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                换一张
              </button>
            )}
          </div>

          {/* 拍摄要点 */}
          <div className="flex flex-col gap-1">
            <div className="text-[12px] text-fg-dim">拍摄要点</div>
            <ul className="m-0 pl-[18px] text-[12px] text-fg-faint leading-relaxed">
              {meta.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          {/* 补充说明 */}
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim">
            补充说明（可选）
            <input
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={meta.placeholder}
              maxLength={60}
            />
          </label>

          <p className="modal-hint">
            {meta.hint}
            <br />
            图片仅用于本次解读，不会保存到会话记录（压缩后上传）。相术为传统文化参考，非科学结论。
          </p>
          {err && <p className="text-[13px] text-vermilion m-0">{err}</p>}
        </div>

        <div className="flex justify-end gap-2.5 px-[18px] py-3.5 border-t border-line">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            disabled={!image || busy}
            onClick={() => image && onSubmit({ ...image, note: note.trim() || undefined })}
          >
            开始解读
          </button>
        </div>
      </div>
    </div>
  );
}
