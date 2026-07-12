import type { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { QuickActions, type CastPreset } from './QuickActions';
import type { CastType } from './CastModal';

interface Props {
  messages: ChatMessage[];
  onPick: (p: CastPreset) => void;
  onOpenCast: (type: CastType) => void;
}

export function ChatView({ messages, onPick, onOpenCast }: Props) {
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center gap-[26px] px-1.5 pb-[26px]">
        <div className="text-center">
          <p className="font-brush text-[22px] text-gold-bright tracking-[2px] m-0 mb-3 leading-[1.7]">
            易有太极，是生两仪；两仪生四象，四象生八卦。
          </p>
          <p className="text-fg-dim text-[14px] leading-[1.9] m-0 mx-auto max-w-[460px]">
            心念所系，铜钱一掷，便见天时人事。下方择一而起，或于框中自陈其问。
          </p>
        </div>
        <QuickActions onPick={onPick} onOpenCast={onOpenCast} />
      </div>
    );
  }

  // 未完成的卦在打开时由 App 自动续答：其助手气泡处于 isStreaming，MessageBubble 会显示
  // 「演算中」的三点加载动画；解读流式返回即渲染为内容，无需任何手动按钮。
  return (
    <div className="flex flex-col gap-[18px]">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  );
}
