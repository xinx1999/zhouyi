import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSave: (cfg: { apiKey?: string; baseUrl?: string; model?: string; adminToken?: string }) => Promise<void> | void;
}

export function SettingsModal({ onClose, onSave }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '');
  const [msg, setMsg] = useState('');

  const save = async () => {
    setMsg('保存中…');
    try {
      await onSave({
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
        adminToken: adminToken.trim() || undefined,
      });
      if (adminToken.trim()) localStorage.setItem('adminToken', adminToken.trim());
      else localStorage.removeItem('adminToken');
      setMsg('已保存（当前进程有效，重启后需重新设置）');
      setTimeout(onClose, 800);
    } catch (e: any) {
      setMsg('保存失败：' + (e?.message || '未知错误'));
    }
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
          <h3 className="m-0 font-brush text-[20px] text-gold-bright tracking-wide">连接设置 · Agnes AI</h3>
          <button className="bg-transparent border-0 text-fg-dim text-2xl leading-none cursor-pointer" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-[18px] flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            API Key
            <input
              className="field"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-...（留空则沿用 .env）"
              type="password"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            Base URL
            <input
              className="field"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://apihub.agnes-ai.com/v1"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            默认模型
            <input
              className="field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="agnes-2.0-flash"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-fg-dim flex-1">
            管理令牌
            <input
              className="field"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="留空则无保护（若服务端已设置 APP_ADMIN_TOKEN 则必填）"
              type="password"
            />
          </label>
          {msg && <p className="modal-hint">{msg}</p>}
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
            onClick={save}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
