/**
 * Colored text component with preset styles.
 *
 * @module tui/components/common/Text
 */

import React from 'react';
import { Text as InkText } from 'ink';
import type { TextProps as InkTextProps } from 'ink';

export interface TextProps extends InkTextProps {
  /** Text color */
  color?: string;
  /** Bold text */
  bold?: boolean;
  /** Dim/faded text */
  dimColor?: boolean;
  /** Inverse colors */
  inverse?: boolean;
  /** Italic text */
  italic?: boolean;
  /** Underline text */
  underline?: boolean;
  /** Strikethrough text */
  strikethrough?: boolean;
}

/**
 * Styled text component.
 */
export function Text({
  children,
  color,
  bold,
  dimColor,
  inverse,
  italic,
  underline,
  strikethrough,
  ...props
}: TextProps): React.JSX.Element {
  return (
    <InkText
      color={color}
      bold={bold}
      dimColor={dimColor}
      inverse={inverse}
      italic={italic}
      underline={underline}
      strikethrough={strikethrough}
      {...props}
    >
      {children}
    </InkText>
  );
}

/** Success text (green) */
export function Success(props: TextProps): React.JSX.Element {
  return <Text color="green" {...props} />;
}

/** Warning text (yellow) */
export function Warning(props: TextProps): React.JSX.Element {
  return <Text color="yellow" {...props} />;
}

/** Error text (red) */
export function Error(props: TextProps): React.JSX.Element {
  return <Text color="red" {...props} />;
}

/** Info text (blue) */
export function Info(props: TextProps): React.JSX.Element {
  return <Text color="blue" {...props} />;
}

/** Muted/dimmed text */
export function Muted(props: TextProps): React.JSX.Element {
  return <Text dimColor {...props} />;
}

/** Highlighted text (cyan) */
export function Highlight(props: TextProps): React.JSX.Element {
  return <Text color="cyan" {...props} />;
}

/** Bold text */
export function Bold(props: TextProps): React.JSX.Element {
  return <Text bold {...props} />;
}
