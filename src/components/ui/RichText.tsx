import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface RichTextProps {
  content: string;
  className?: string;
}

const RichText: React.FC<RichTextProps> = ({ content, className }) => {
  if (!content) return null;

  // Split by block math delimiters: $$...$$ or \[...\]
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        // Block Math
        if (part.startsWith('$$') && part.endsWith('$$')) {
          try {
            return <BlockMath key={i} math={part.slice(2, -2)} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        }
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          try {
            return <BlockMath key={i} math={part.slice(2, -2)} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        }
        
        // Inline Math splitting
        // Split by $...$ or \(...\)
        const inlineParts = part.split(/(\$[^$]*?\$|\\\([\s\S]*?\\\))/g);
        return (
            <span key={i}>
                {inlineParts.map((subPart, j) => {
                    if (subPart.startsWith('$') && subPart.endsWith('$')) {
                        try {
                          return <InlineMath key={j} math={subPart.slice(1, -1)} />;
                        } catch {
                          return <span key={j}>{subPart}</span>;
                        }
                    }
                    if (subPart.startsWith('\\(') && subPart.endsWith('\\)')) {
                        try {
                          return <InlineMath key={j} math={subPart.slice(2, -2)} />;
                        } catch {
                          return <span key={j}>{subPart}</span>;
                        }
                    }
                    return <span key={j}>{subPart}</span>;
                })}
            </span>
        );
      })}
    </div>
  );
};

export default RichText;
