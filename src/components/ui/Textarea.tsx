import React from 'react';
import { twMerge } from 'tailwind-merge';

// `ref` is accepted as a plain prop (React 19) so callers can drive the caret,
// e.g. inserting a cloze placeholder at the cursor.
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
};

const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <textarea
      className={twMerge(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};

export default Textarea;
