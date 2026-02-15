/**
 * Styled box wrapper component.
 *
 * @module tui/components/common/Box
 */

import React, { type ReactNode } from 'react';
import { Box as InkBox } from 'ink';
import type { BoxProps as InkBoxProps } from 'ink';

export interface BoxProps extends Omit<InkBoxProps, 'children'> {
  /** Box content */
  children?: ReactNode;
  /** Padding on all sides */
  padding?: number;
  /** Horizontal padding */
  paddingX?: number;
  /** Vertical padding */
  paddingY?: number;
  /** Margin on all sides */
  margin?: number;
  /** Horizontal margin */
  marginX?: number;
  /** Vertical margin */
  marginY?: number;
}

/**
 * Reusable box component with common styling props.
 */
export function StyledBox({
  children,
  padding,
  paddingX,
  paddingY,
  margin,
  marginX,
  marginY,
  ...props
}: BoxProps): React.JSX.Element {
  return (
    <InkBox
      paddingLeft={paddingX ?? padding}
      paddingRight={paddingX ?? padding}
      paddingTop={paddingY ?? padding}
      paddingBottom={paddingY ?? padding}
      marginLeft={marginX ?? margin}
      marginRight={marginX ?? margin}
      marginTop={marginY ?? margin}
      marginBottom={marginY ?? margin}
      {...props}
    >
      {children}
    </InkBox>
  );
}

export { StyledBox as Box };
