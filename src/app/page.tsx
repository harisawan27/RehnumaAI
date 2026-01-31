import { redirect } from 'next/navigation';

export default function Home() {
  // The dashboard will handle auth check and redirect to login if necessary
  redirect('/login');
}