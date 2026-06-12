import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Library } from '@/lib/api/services';
import type { Student } from '@/lib/api/types';
import { compactId, formatDate, fullName, idOf, inputDate, isRecord, money, numberValue, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

export function LibraryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [activeBook, setActiveBook] = useState<any>(null);

  const booksQuery = useQuery({
    queryKey: ['library-books', q],
    queryFn: () => Library.books.list({ q, page: 1, limit: 50 }),
  });
  const issuesQuery = useQuery({
    queryKey: ['library-issues'],
    queryFn: () => Library.issues.list({ page: 1, limit: 50 }),
  });
  const overdueQuery = useQuery({
    queryKey: ['library-overdue'],
    queryFn: () => Library.issues.overdue({ page: 1, limit: 50 }),
  });
  const books = rowsFrom<any>(booksQuery.data, ['books', 'data']);
  const issues = rowsFrom<any>(issuesQuery.data, ['issues', 'data']);
  const overdue = rowsFrom<any>(overdueQuery.data, ['issues', 'data']);
  const availableBooks = books.filter((book) => textOf(book, ['status'], '').toUpperCase() === 'AVAILABLE');
  const issuedIssues = issues.filter((issue) => textOf(issue, ['status'], '').toUpperCase() === 'ISSUED');
  const catalogMeta = isRecord(booksQuery.data?.meta) ? booksQuery.data?.meta : {};

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['library-books'] });
    qc.invalidateQueries({ queryKey: ['library-issues'] });
    qc.invalidateQueries({ queryKey: ['library-overdue'] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 11"
        title="Library"
        subtitle="Live catalog, barcode checkout, returns, overdue tracking, and fine settlement."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Catalog books" value={textOf(catalogMeta, ['total'], String(books.length))} tone="chip-brand" />
        <Stat label="Available copies" value={availableBooks.length} tone="chip-success" />
        <Stat label="Issued books" value={issuedIssues.length} tone="chip-warning" />
        <Stat label="Overdue" value={overdue.length} tone={overdue.length ? 'chip-danger' : 'chip-success'} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Active issues" subtitle="Current checkout transactions">
          {issuedIssues.map((issue) => <IssueCard key={idOf(issue)} issue={issue} />)}
          {!issuedIssues.length && <EmptyLine text="No currently issued books." />}
        </Panel>

        <Panel title="Overdue / fines" subtitle="Returned by `/library/issues/overdue`">
          {overdue.map((issue) => <FineCard key={idOf(issue)} issue={issue} onPaid={invalidate} />)}
          {!overdue.length && <EmptyLine text="No overdue books right now." />}
        </Panel>
      </section>

      <section className="card p-4">
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search title, author, ISBN, barcode..."
            className="input pl-9"
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="font-display text-lg font-semibold">Book catalog</h2>
            <p className="text-sm text-ink-500">Loaded from `/library/books`.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-muted/60">
                <tr>
                  <th className="table-header">Book</th>
                  <th className="table-header">Barcode</th>
                  <th className="table-header">Rack</th>
                  <th className="table-header">Fine/day</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={idOf(book)} className="hover:bg-muted/40">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <BookCover title={textOf(book, ['title'], 'Book')} />
                        <div>
                          <p className="font-semibold text-ink-900">{textOf(book, ['title'])}</p>
                          <p className="text-xs text-ink-500">{textOf(book, ['author'])} · {textOf(book, ['category'], 'Uncategorised')}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-ink-400">{textOf(book, ['isbn'])}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs">{textOf(book, ['barcode'])}</td>
                    <td className="table-cell">{textOf(book, ['rackLocation'])}</td>
                    <td className="table-cell">{money(textOf(book, ['finePerDay'], '0'))}</td>
                    <td className="table-cell"><span className={statusClass(textOf(book, ['status'], ''))}>{textOf(book, ['status'])}</span></td>
                    <td className="table-cell text-right">
                      <button onClick={() => setActiveBook(book)} className="btn-ghost px-3 py-1.5 text-xs">Manage</button>
                    </td>
                  </tr>
                ))}
                {!books.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-400">
                      {booksQuery.isLoading ? 'Loading catalog...' : 'No books returned by the API.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <AnimatePresence>
        {activeBook && <BookManagerModal book={activeBook} onClose={() => setActiveBook(null)} onChanged={() => { setActiveBook(null); invalidate(); }} />}
      </AnimatePresence>
    </div>
  );
}

function BookManageModal({ book, onClose, onChanged }: { book: any; onClose: () => void; onChanged: () => void }) {
  const [rackLocation, setRackLocation] = useState(textOf(book, ['rackLocation'], ''));
  const [status, setStatus] = useState(textOf(book, ['status'], 'AVAILABLE'));
  const update = useMutation({
    mutationFn: () => Library.books.update(idOf(book), { rackLocation, status }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Book updated');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update book'),
  });
  const remove = useMutation({
    mutationFn: () => Library.books.remove(idOf(book)),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Book removed');
      onChanged();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove book'),
  });

  return (
    <Modal
      title={textOf(book, ['title'])}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={() => { if (confirm('Remove this book copy from catalog?')) remove.mutate(); }} disabled={remove.isPending} className="btn-ghost text-danger hover:bg-danger-bg">Remove</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => update.mutate()} disabled={update.isPending || !rackLocation} className="btn-primary">
            {update.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <BookCover title={textOf(book, ['title'], 'Book')} large />
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{textOf(book, ['author'])}</p>
          <p className="mt-1 font-mono text-xs text-ink-400">{textOf(book, ['barcode'])}</p>
          <p className="mt-1 text-xs text-ink-500">{textOf(book, ['isbn'])} · {compactId(book)}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input label="Rack location" value={rackLocation} onChange={setRackLocation} />
        <div>
          <label className="label">Status</label>
          <select className="input mt-2" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ISSUED">ISSUED</option>
            <option value="DAMAGED">DAMAGED</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

function BookManagerModal({ book, onClose, onChanged }: { book: any; onClose: () => void; onChanged: () => void }) {
  const title = textOf(book, ['title'], 'Book copy');
  const author = textOf(book, ['author'], 'Unknown author');
  const category = textOf(book, ['category'], 'Uncategorised');
  const isbn = textOf(book, ['isbn'], '—');
  const barcode = textOf(book, ['barcode'], '—');
  const rack = textOf(book, ['rackLocation'], 'Not assigned');
  const statusValue = textOf(book, ['status'], 'AVAILABLE');
  const finePerDay = money(textOf(book, ['finePerDay'], '0'));
  const copyId = compactId(book);

  return (
    <Modal
      title={`View ${title}`}
      onClose={onClose}
      size="full"
      closeLabel="Back to library"
    >
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-line bg-gradient-to-br from-brand-50 via-white to-canvas p-5 sm:p-6 shadow-soft">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <BookCover title={title} large />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">Library copy</p>
                <h3 className="mt-2 text-2xl sm:text-3xl font-display font-semibold text-ink-900 break-words">{title}</h3>
                <p className="mt-2 text-sm text-ink-600">{author}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="chip-brand">{category}</span>
                  <span className={statusClass(statusValue)}>{statusValue}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-500">
                  <span className="chip-brand">Barcode: {barcode}</span>
                  <span className="chip-brand">ISBN: {isbn}</span>
                  <span className="chip-brand">Copy ID: {copyId}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full xl:w-[360px]">
              <BookInfo label="Rack" value={rack} />
              <BookInfo label="Fine / day" value={finePerDay} />
              <BookInfo label="Status" value={statusValue} />
              <BookInfo label="Barcode" value={barcode} mono />
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <section className="rounded-[2rem] border border-line bg-surface p-4 sm:p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-600 font-bold">Book details</p>
                <h4 className="mt-1 text-lg font-semibold text-ink-900">Read-only summary</h4>
              </div>
              <span className="chip-brand">{statusValue}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <BookInfo label="Title" value={title} />
              <BookInfo label="Author" value={author} />
              <BookInfo label="Category" value={category} />
              <BookInfo label="ISBN" value={isbn} mono />
              <BookInfo label="Barcode" value={barcode} mono />
              <BookInfo label="Rack location" value={rack} />
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">Copy metrics</p>
                  <p className="mt-1 text-sm text-ink-500">Keep the book facts visible while you edit the shelf location and status.</p>
                </div>
                <span className="chip-brand">{finePerDay} / day</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <BookInfo label="Copy ID" value={copyId} mono />
                <BookInfo label="Current status" value={statusValue} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function IssueModal({ books, students, onClose, onSaved }: { books: any[]; students: Student[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    barcode: books[0] ? textOf(books[0], ['barcode'], '') : '',
    studentId: students[0]?.id ?? '',
    dueDate: inputDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
  });
  const issue = useMutation({
    mutationFn: () => Library.issue(form),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Book issued');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to issue book'),
  });

  return (
    <Modal
      title="Issue book by barcode"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => issue.mutate()} disabled={issue.isPending || !form.barcode || !form.studentId || !form.dueDate} className="btn-primary">
            {issue.isPending ? 'Issuing...' : 'Issue book'}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Book barcode</label>
          <select className="input mt-2" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })}>
            <option value="">Select available book</option>
            {books.map((book) => (
              <option key={idOf(book)} value={textOf(book, ['barcode'], '')}>{textOf(book, ['title'])} · {textOf(book, ['barcode'])}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Student</label>
          <select className="input mt-2" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
            ))}
          </select>
        </div>
        <Input label="Due date" type="date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
      </div>
    </Modal>
  );
}

function ReturnModal({ issues, onClose, onSaved }: { issues: any[]; onClose: () => void; onSaved: () => void }) {
  const [barcode, setBarcode] = useState(issues[0] ? textOf(issues[0].bookId, ['barcode'], '') : '');
  const returnBook = useMutation({
    mutationFn: () => Library.return({ barcode }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Book returned');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to return book'),
  });

  return (
    <Modal
      title="Return book"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => returnBook.mutate()} disabled={returnBook.isPending || !barcode} className="btn-primary">
            {returnBook.isPending ? 'Returning...' : 'Return book'}
          </button>
        </>
      }
    >
      <label className="label">Issued barcode</label>
      <select className="input mt-2" value={barcode} onChange={(event) => setBarcode(event.target.value)}>
        <option value="">Select issued book</option>
        {issues.map((issue) => (
          <option key={idOf(issue)} value={textOf(issue.bookId, ['barcode'], '')}>
            {textOf(issue.bookId, ['title'])} · {textOf(issue.bookId, ['barcode'])} · {fullName(issue.studentId)}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs text-ink-400">The API calculates overdue fine automatically during return.</p>
    </Modal>
  );
}

function IssueCard({ issue }: { issue: any }) {
  return (
    <div className="rounded-xl border border-line bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">{textOf(issue.bookId, ['title'], 'Book')}</p>
          <p className="text-xs text-ink-500">{fullName(issue.studentId, compactId(issue.studentId))}</p>
        </div>
        <span className={statusClass(textOf(issue, ['status'], ''))}>{textOf(issue, ['status'])}</span>
      </div>
      <p className="mt-2 text-xs text-ink-400">Due {formatDate(textOf(issue, ['dueDate'], ''))} · {textOf(issue.bookId, ['barcode'], 'barcode')}</p>
    </div>
  );
}

function FineCard({ issue, onPaid }: { issue: any; onPaid: () => void }) {
  const pay = useMutation({
    mutationFn: () => Library.fines.pay(idOf(issue)),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Fine paid');
      onPaid();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to settle fine'),
  });
  const fine = numberValue(issue.fineAmount, 0);
  const paid = Boolean(issue.finePaid);

  return (
    <div className="rounded-xl border border-line bg-danger-bg/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">{textOf(issue.bookId, ['title'], 'Book')}</p>
          <p className="text-xs text-ink-500">{fullName(issue.studentId, compactId(issue.studentId))} · {money(fine)}</p>
        </div>
        <span className={paid ? 'chip-success' : 'chip-danger'}>{paid ? 'Paid' : 'Due'}</span>
      </div>
      {!paid && fine > 0 && (
        <button onClick={() => pay.mutate()} disabled={pay.isPending} className="btn-outline mt-3 px-3 py-1.5 text-xs">
          {pay.isPending ? 'Settling...' : 'Settle fine'}
        </button>
      )}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-ink-500">{subtitle}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="stat-card">
      <p className="label">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-bold">{value}</p>
        <span className={tone}>live</span>
      </div>
    </div>
  );
}

function BookCover({ title, large = false }: { title: string; large?: boolean }) {
  const seed = title.length % 5;
  const gradients = [
    'from-brand-500 to-info',
    'from-success to-info',
    'from-warning to-danger',
    'from-ink-700 to-brand-500',
    'from-danger to-brand-600',
  ];
  return (
    <div className={clsx('shrink-0 rounded-lg bg-gradient-to-br shadow-soft', gradients[seed], large ? 'h-28 w-20' : 'h-14 w-10')} />
  );
}

function BookInfo({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-bold">{label}</p>
      <p className={clsx('mt-1 break-words text-sm font-semibold text-ink-900', mono && 'font-mono text-xs')}>
        {value || '—'}
      </p>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input mt-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">{text}</p>;
}
