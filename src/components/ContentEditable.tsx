import React, { useRef, useEffect } from 'react';

export interface ContentEditableProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'disabled'> {
  html: string;
  disabled?: boolean;
  tagName?: string;
  placeholder?: string;
}

export const ContentEditable: React.FC<ContentEditableProps> = ({
  html,
  disabled,
  tagName,
  placeholder,
  className,
  id,
  ...rest
}) => {
  const elRef = useRef<HTMLElement | null>(null);
  
  // Keep track of the HTML so we don't apply it if it matches the current DOM
  const prevHtmlRef = useRef(html);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // Only update innerHTML if the incoming HTML different from what's currently there
    // and if the element is NOT focused (so we don't interrupt active typing)
    if (html !== el.innerHTML) {
      if (document.activeElement !== el) {
        el.innerHTML = html;
      }
    }
    prevHtmlRef.current = html;
  }, [html]);

  // Set initial content on mount
  useEffect(() => {
    const el = elRef.current;
    if (el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, []);

  const Element = (tagName || 'div') as any;

  return (
    <Element
      {...rest}
      id={id}
      ref={elRef}
      contentEditable={!disabled}
      suppressContentEditableWarning
      className={className}
      placeholder={placeholder}
      onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
        if (rest.onFocus) rest.onFocus(e);
      }}
      onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
        // Double check on blur that the DOM content matches state
        const el = elRef.current;
        if (el && el.innerHTML !== html) {
          el.innerHTML = html;
        }
        if (rest.onBlur) rest.onBlur(e);
      }}
      onInput={(e: React.FormEvent<HTMLDivElement>) => {
        prevHtmlRef.current = e.currentTarget.innerHTML;
        if (rest.onInput) {
          rest.onInput(e);
        }
      }}
    />
  );
};
