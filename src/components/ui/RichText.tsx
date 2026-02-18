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
          return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
             return <BlockMath key={i} math={part.slice(2, -2)} />;
        }
        
        // Inline Math splitting
        // Split by $...$ or \(...\)
        const inlineParts = part.split(/(\$[^$]*?\$|\\\([\s\S]*?\\\))/g);
        return (
            <span key={i}>
                {inlineParts.map((subPart, j) => {
                    if (subPart.startsWith('$') && subPart.endsWith('$')) {
                        return <InlineMath key={j} math={subPart.slice(1, -1)} />;
                    }
                    if (subPart.startsWith('\\(') && subPart.endsWith('\\)')) {
                        return <InlineMath key={j} math={subPart.slice(2, -2)} />;
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