import dynamic from 'next/dynamic';

// Dynamically import the client component with no SSR so that client-only
// hooks (useSearchParams, useState) run in a client boundary.
const VerifyEmailClient = dynamic(() => import('./VerifyEmailClient'), { ssr: false });

export default function Page() {
  return <VerifyEmailClient />;
}
