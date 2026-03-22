import { css } from '@emotion/react';
import { Component, ReactNode } from 'react';
import { Button, Spacing, Text } from '_tosslib/components';
import { colors } from '_tosslib/constants/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          css={css`
            padding: 40px 24px;
            text-align: center;
          `}
        >
          <Text typography="t5" fontWeight="bold" color={colors.grey900}>
            문제가 발생했습니다
          </Text>
          <Spacing size={8} />
          <Text typography="t7" color={colors.grey500}>
            페이지를 불러오는 중 오류가 발생했습니다.
          </Text>
          <Spacing size={24} />
          <Button onClick={this.handleRetry}>다시 시도</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
