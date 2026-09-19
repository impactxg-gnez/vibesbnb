import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  params: { id: string };
};

export default function ListingLayout({ children }: Props) {
  return children;
}
