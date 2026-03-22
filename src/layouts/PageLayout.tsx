import { colors } from '_tosslib/constants/colors';
import { css } from '@emotion/react';

import { ReactNode } from 'react';

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div
      css={css`
        max-width: 100%;
        width: 100%;
        padding: 0;
        margin: 0;
        min-height: 100vh;
        background: ${colors.greyBackground};
      `}
    >
      <div
        css={css`
          max-width: 480px;
          margin: 0 auto;
          background: ${colors.background};
          min-height: 100vh;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.04);
        `}
      >
        {children}
      </div>
    </div>
  );
}
