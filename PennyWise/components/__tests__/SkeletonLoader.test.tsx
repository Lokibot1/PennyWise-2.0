import React from 'react';
import { render } from '@testing-library/react-native';
import {
  SkeletonBox,
  HomeDashboardSkeleton,
  TransactionRowSkeleton,
  CategoryPageSkeleton,
  ProfileCardSkeleton,
  ProfileInfoSkeleton,
  ProfileAvatarSkeleton,
  ActivityHistorySkeleton,
  ProfileMenuSkeleton,
} from '../SkeletonLoader';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      cardBg:  '#FFFFFF',
      surface: '#F2F8F4',
      divider: '#E0EDE6',
      isDark:  false,
    },
  }),
}));

// ── SkeletonBox ───────────────────────────────────────────────────────────────

describe('SkeletonBox', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SkeletonBox />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies the provided width and height', () => {
    const { toJSON } = render(<SkeletonBox width={120} height={24} />);
    const root = toJSON() as any;
    const style = [root.props.style].flat();
    const sizeStyle = style.find((s: any) => s?.width !== undefined);
    expect(sizeStyle?.width).toBe(120);
    expect(sizeStyle?.height).toBe(24);
  });

  it('applies the provided borderRadius', () => {
    const { toJSON } = render(<SkeletonBox borderRadius={16} />);
    const root = toJSON() as any;
    const style = [root.props.style].flat();
    const radiusStyle = style.find((s: any) => s?.borderRadius !== undefined);
    expect(radiusStyle?.borderRadius).toBe(16);
  });

  it('uses default dimensions when no props are passed', () => {
    const { toJSON } = render(<SkeletonBox />);
    const root = toJSON() as any;
    const style = [root.props.style].flat();
    const sizeStyle = style.find((s: any) => s?.height !== undefined);
    expect(sizeStyle?.height).toBe(16);
  });
});

// ── Composite skeletons — smoke tests ─────────────────────────────────────────

describe('HomeDashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HomeDashboardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('TransactionRowSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TransactionRowSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('applies a bottom border when isLast is false (default)', () => {
    const { getByTestId } = render(<TransactionRowSkeleton />);
    const row = getByTestId('transaction-row-skeleton');
    const style = [row.props.style].flat();
    const borderStyle = style.find((s: any) => s?.borderBottomWidth !== undefined);
    expect(borderStyle?.borderBottomWidth).toBe(1);
  });

  it('removes the bottom border when isLast is true', () => {
    const { getByTestId } = render(<TransactionRowSkeleton isLast />);
    const row = getByTestId('transaction-row-skeleton');
    const style = [row.props.style].flat();
    const borderStyle = style.find((s: any) => s?.borderBottomWidth !== undefined);
    expect(borderStyle?.borderBottomWidth).toBe(0);
  });
});

describe('CategoryPageSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CategoryPageSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ProfileCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileCardSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ProfileInfoSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileInfoSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ProfileAvatarSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileAvatarSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ActivityHistorySkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ActivityHistorySkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('ProfileMenuSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileMenuSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
