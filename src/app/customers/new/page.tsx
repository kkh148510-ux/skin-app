import Link from 'next/link';
import NewCustomerForm from '@/components/NewCustomerForm';

export default function NewCustomerPage() {
  return (
    <main className="px-4 pt-6">
      <header className="flex items-center gap-3 mb-4">
        <Link href="/customers" className="text-muted text-2xl leading-none">
          ←
        </Link>
        <h1 className="text-xl font-bold">고객 추가</h1>
      </header>
      <NewCustomerForm />
    </main>
  );
}
