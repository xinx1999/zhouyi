import type { ChatMessage } from '../types';
import { HexagramCard } from './HexagramCard';

// 极简 markdown：支持 **加粗** 与换行，安全渲染为 React 节点
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, j) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={j}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={j}>{p}</span>
    )
  );
}

// 把一段文本按行渲染为若干 <p>，空行变间距
function renderParagraphs(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (line.trim() === '') {
      nodes.push(<div key={i} className="md-space" />);
      return;
    }
    nodes.push(
      <p key={i} className="md-line">
        {renderInline(line)}
      </p>
    );
  });
  return nodes;
}

// 把内容拆成「正文」与「总结」：总结以独立行的「## 总结」标记（兼容行首「总结：」）
function splitSummary(text: string): { body: string; summary: string | null } {
  const m = text.match(/\n#{1,6}\s*总结\s*\n?/);
  if (m && m.index != null) {
    return {
      body: text.slice(0, m.index).replace(/\n+$/, ''),
      summary: text.slice(m.index + m[0].length).replace(/^\n+/, ''),
    };
  }
  const m2 = text.match(/^#{1,6}\s*总结\s*[:：]?\s*/);
  if (m2 && text.length > m2[0].length) {
    return { body: '', summary: text.slice(m2[0].length).replace(/^\n+/, '') };
  }
  return { body: text, summary: null };
}

// 助手消息：正文照常渲染，末尾「总结」段抽成高亮卡片
function SummaryAware({ content }: { content: string }) {
  const { body, summary } = splitSummary(content);
  return (
    <>
      {body.trim() && <div className="md">{renderParagraphs(body)}</div>}
      {summary && summary.trim() && (
        <div className="summary-card">
          <div className="summary-head">总结</div>
          <div className="md">{renderParagraphs(summary)}</div>
        </div>
      )}
    </>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={'flex gap-2.5 items-start' + (isUser ? ' flex-row-reverse' : '')}>
      {!isUser && (
        <div className="flex-none pt-1" aria-hidden>
          <span className="seal seal-sm">易</span>
        </div>
      )}
      <div className={'max-w-[84%] flex flex-col gap-2.5 min-w-0' + (isUser ? ' items-end' : '')}>
        {!isUser && message.hexagram && <HexagramCard cast={message.hexagram} />}
        <div
          className={
            'px-3.5 py-3 rounded-card text-[15px] leading-[1.85] break-words ' +
            (isUser
              ? ' bg-gradient-to-b from-panel-2 to-panel border border-gold-dim text-fg rounded-tr-md'
              : ' bg-[rgba(33,27,20,0.6)] border border-line text-fg rounded-tl-md')
          }
        >
          {message.content ? (
            isUser ? (
              <div className="md">{renderParagraphs(message.content)}</div>
            ) : (
              <SummaryAware content={message.content} />
            )
          ) : message.isStreaming ? (
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
