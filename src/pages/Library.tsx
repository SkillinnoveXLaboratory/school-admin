import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Library } from '@/lib/api/services';

const BOOKS = [
  { id: 'b1', title: 'Wings of Fire',            author: 'A.P.J. Abdul Kalam', isbn: '978-8173711466', copies: 12, available: 9,  category: 'Biography', colorA: '#F59E0B', colorB: '#EF4444' },
  { id: 'b2', title: 'The Discovery of India',   author: 'Jawaharlal Nehru',   isbn: '978-0143031031', copies:  6, available: 2,  category: 'History',   colorA: '#0EA5E9', colorB: '#10B981' },
  { id: 'b3', title: 'Train to Pakistan',        author: 'Khushwant Singh',    isbn: '978-0143065883', copies:  4, available: 0,  category: 'Fiction',   colorA: '#EF4444', colorB: '#7C3AED' },
  { id: 'b4', title: 'Algebra & Trigonometry',   author: 'M.L. Khanna',        isbn: '978-8189652555', copies: 20, available: 14, category: 'Textbook',  colorA: '#10B981', colorB: '#0EA5E9' },
  { id: 'b5', title: 'Physics — Concepts',       author: 'H.C. Verma',         isbn: '978-8177092325', copies: 18, available: 11, category: 'Textbook',  colorA: '#7C3AED', colorB: '#EC4899' },
];

export function LibraryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState<any>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const { data = [] } = useQuery<any[]>({ queryKey: ['books', q], queryFn: () => Library.books.list({ q }) as any });
  const rows = data.length ? data : BOOKS;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module 11" title="Library"
        subtitle="Catalog, issues, returns, and overdue fines."
        actions={<>
          <button onClick={() => setIssueOpen(true)} className="btn-outline"><Icon name="download" size={16}/> Issue book</button>
          <button onClick={() => setAdding(true)} className="btn-primary"><Icon name="plus" size={16}/> Add book</button>
        </>} />

      <div className="card p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, author, ISBN…" className="input pl-9" />
        </div>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((b:any) => (
          <article key={b.id} onClick={() => setActive(b)} className="card p-5 cursor-pointer hover:shadow-pop hover:border-brand-300 transition-all">
            <div className="flex gap-4">
              <div className="h-20 w-14 rounded-lg shadow-soft" style={{ background: `linear-gradient(135deg, ${b.colorA ?? '#4F46E5'} 0%, ${b.colorB ?? '#8B5CF6'} 100%)` }}/>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base font-semibold truncate">{b.title}</h3>
                <p className="text-xs text-ink-500 mt-0.5">{b.author}</p>
                <p className="text-[11px] text-ink-400 mt-2 font-mono">{b.isbn}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-500">{b.available}/{b.copies} available</span>
                  {(b.available ?? 1) > 0 ? <span className="chip-success">Available</span> : <span className="chip-warning">All out</span>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <AnimatePresence>
        {adding && <BookFormModal onClose={() => setAdding(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['books'] }); setAdding(false); }}/>}
        {active && (
          <BookDetailModal book={active} onClose={() => setActive(null)}
            onIssue={() => { setIssueOpen(true); setActive(null); }}
            onEdited={() => { qc.invalidateQueries({ queryKey: ['books'] }); setActive(null); }}
            onRemoved={() => { qc.invalidateQueries({ queryKey: ['books'] }); setActive(null); }}/>
        )}
        {issueOpen && <IssueModal onClose={() => setIssueOpen(false)}/>}
      </AnimatePresence>
    </div>
  );
}

function BookFormModal({ book, onClose, onSaved }: { book?: any; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: book?.title ?? '', author: book?.author ?? '', isbn: book?.isbn ?? '',
    category: book?.category ?? 'Textbook', copies: book?.copies ?? 1,
  });
  const save = useMutation({
    mutationFn: () => book ? Library.books.update(book.id, f) : Library.books.create(f),
    onSuccess: () => { toast.success(book ? 'Book updated' : 'Book added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title={book ? `Edit ${book.title}` : 'Add book'} onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || !f.title} className="btn-primary">{save.isPending ? 'Saving…' : 'Save'}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" value={f.title} onChange={v => setF({ ...f, title: v })}/>
        <Field label="Author" value={f.author} onChange={v => setF({ ...f, author: v })}/>
        <Field label="ISBN" value={f.isbn} onChange={v => setF({ ...f, isbn: v })}/>
        <Field label="Category" value={f.category} onChange={v => setF({ ...f, category: v })}/>
        <Field label="Copies" type="number" value={String(f.copies)} onChange={v => setF({ ...f, copies: Number(v) })}/>
      </div>
    </Modal>
  );
}

function BookDetailModal({ book, onClose, onIssue, onEdited, onRemoved }: { book: any; onClose: () => void; onIssue: () => void; onEdited: () => void; onRemoved: () => void }) {
  const [editing, setEditing] = useState(false);
  const remove = useMutation({
    mutationFn: () => Library.books.remove(book.id),
    onSuccess: () => { toast.success('Removed'); onRemoved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  if (editing) return <BookFormModal book={book} onClose={() => setEditing(false)} onSaved={onEdited}/>;
  return (
    <Modal title={book.title} onClose={onClose}
      footer={<>
        <button onClick={() => { if (confirm('Remove from catalog?')) remove.mutate(); }}
          className="btn-ghost text-danger hover:bg-danger-bg">Remove</button>
        <button onClick={onClose} className="btn-ghost">Close</button>
        <button onClick={() => setEditing(true)} className="btn-outline">Edit</button>
        <button onClick={onIssue} className="btn-primary"><Icon name="download" size={14}/> Issue copy</button>
      </>}>
      <div className="flex gap-4">
        <div className="h-32 w-24 rounded-lg shadow-soft" style={{ background: `linear-gradient(135deg, ${book.colorA ?? '#4F46E5'} 0%, ${book.colorB ?? '#8B5CF6'} 100%)` }}/>
        <div>
          <h3 className="font-display text-xl font-semibold">{book.title}</h3>
          <p className="text-sm text-ink-500">{book.author}</p>
          <p className="text-xs text-ink-400 font-mono mt-2">{book.isbn}</p>
          <div className="mt-3 flex gap-1.5">
            <span className="chip-brand">{book.category ?? 'Textbook'}</span>
            <span className="chip-success">{book.available}/{book.copies} available</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function IssueModal({ onClose }: { onClose: () => void }) {
  const [bookId, setBookId] = useState('');
  const [studentId, setStudentId] = useState('');
  const issue = useMutation({
    mutationFn: () => Library.issue({ bookId, studentId }),
    onSuccess: () => { toast.success('Book issued'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Modal title="Issue book" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={() => issue.mutate()} disabled={issue.isPending || !bookId || !studentId} className="btn-primary">{issue.isPending ? 'Issuing…' : 'Issue'}</button>
      </>}>
      <Field label="Book ID" value={bookId} onChange={setBookId}/>
      <div className="mt-3"><Field label="Student ID" value={studentId} onChange={setStudentId}/></div>
      <p className="text-xs text-ink-400 mt-3">Due date is set automatically based on category (default 14 days).</p>
    </Modal>
  );
}

function Field({ label, value, onChange, type='text' }: { label: string; value: string; onChange: (v: string)=>void; type?: string }) {
  return <div><label className="label">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="input mt-2"/></div>;
}
