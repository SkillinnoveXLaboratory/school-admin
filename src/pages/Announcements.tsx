import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { Communication, HR, Students as StudentsApi } from '@/lib/api/services';
import { formatDate, fullName, idOf, rowsFrom, statusClass, textOf } from '@/lib/viewUtils';

type Audience = 'ALL' | 'PARENTS' | 'STAFF' | 'CLASS';

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audienceScope, setAudienceScope] = useState<Audience>('ALL');
  const [meeting, setMeeting] = useState({ teacherId: '', parentId: '', meetingDate: '', agenda: '' });

  const announcementsQuery = useQuery({ queryKey: ['announcements'], queryFn: () => Communication.announcements.list({ page: 1, limit: 50 }) });
  const meetingsQuery = useQuery({ queryKey: ['meetings'], queryFn: () => Communication.meetings.list() });
  const employeesQuery = useQuery({ queryKey: ['hr-employees', 'announcements'], queryFn: () => HR.employees.list({ page: 1, limit: 100 }) });
  const studentsQuery = useQuery({ queryKey: ['students', 'announcements'], queryFn: () => StudentsApi.list({ page: 1, limit: 100 }) });

  const announcements = rowsFrom<any>(announcementsQuery.data, ['announcements', 'data']);
  const meetings = rowsFrom<any>(meetingsQuery.data, ['meetings', 'data']);
  const teachers = useMemo(() => (employeesQuery.data?.employees ?? []).filter((employee) => employee.role === 'TEACHER'), [employeesQuery.data]);
  const students = studentsQuery.data?.students ?? [];

  const send = useMutation({
    mutationFn: () => Communication.announcements.create({ title, content, audienceScope }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Announcement posted');
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setTitle('');
      setContent('');
      setAudienceScope('ALL');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to post announcement'),
  });

  const schedule = useMutation({
    mutationFn: () => Communication.meetings.schedule({
      teacherId: meeting.teacherId,
      parentId: meeting.parentId,
      meetingDate: new Date(meeting.meetingDate).toISOString(),
      agenda: meeting.agenda,
    }),
    onSuccess: (body: any) => {
      toast.success(body?.message || 'Meeting scheduled');
      qc.invalidateQueries({ queryKey: ['meetings'] });
      setMeeting({ teacherId: '', parentId: '', meetingDate: '', agenda: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to schedule meeting'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 7"
        title="Announcements"
        subtitle="Live circulars and parent-teacher meeting schedule."
      />

      <section className="grid min-w-0 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="min-w-0 space-y-5">
          <motion.form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              send.mutate();
            }}
            className="card min-w-0 p-4 sm:p-5 space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h2 className="font-display text-lg font-semibold">Post circular</h2>
              <p className="text-sm text-ink-500">Creates a school announcement through `/announcements`.</p>
            </div>
            <Input label="Title" value={title} onChange={setTitle} required />
            <div>
              <label className="label">Content</label>
              <textarea className="input mt-2 min-h-[140px]" required value={content} onChange={(event) => setContent(event.target.value)} />
            </div>
            <div>
              <label className="label">Audience</label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['ALL', 'PARENTS', 'STAFF', 'CLASS'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAudienceScope(option)}
                    className={audienceScope === option ? 'btn-primary justify-center px-3 py-2 text-xs' : 'btn-outline justify-center px-3 py-2 text-xs'}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={send.isPending || !title || !content} className="btn-primary w-full">
              <Icon name="announcement" size={16} /> {send.isPending ? 'Posting...' : 'Publish'}
            </button>
          </motion.form>

          <div className="card min-w-0 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Schedule PTM</h2>
            <p className="text-sm text-ink-500">Uses `/communication/meetings/schedule`.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Teacher name</label>
                <select className="input mt-2" value={meeting.teacherId} onChange={(event) => setMeeting({ ...meeting, teacherId: event.target.value })}>
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.userId || teacher.id}>
                      {fullName(teacher, 'Teacher')}
                      {teacher.email ? ` · ${teacher.email}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-ink-400">
                  Choose the teacher who will attend the parent meeting.
                </p>
              </div>
              <div>
                <label className="label">Parent / Student</label>
                <select className="input mt-2" value={meeting.parentId} onChange={(event) => setMeeting({ ...meeting, parentId: event.target.value })}>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                      {student.parentContact?.fatherName ? ` · ${student.parentContact.fatherName}` : ''}
                      {student.parentContact?.primaryPhone ? ` · ${student.parentContact.primaryPhone}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-ink-400">
                  Choose the student linked to the parent you want to meet.
                </p>
              </div>
              <Input label="Meeting date" type="datetime-local" value={meeting.meetingDate} onChange={(meetingDate) => setMeeting({ ...meeting, meetingDate })} />
              <Input label="Agenda" value={meeting.agenda} onChange={(agenda) => setMeeting({ ...meeting, agenda })} />
              <button
                onClick={() => schedule.mutate()}
                disabled={schedule.isPending || !meeting.teacherId || !meeting.parentId || !meeting.meetingDate || !meeting.agenda}
                className="btn-primary w-full"
              >
                <Icon name="calendar" size={16} /> {schedule.isPending ? 'Scheduling...' : 'Schedule meeting'}
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="card min-w-0 overflow-hidden">
            <div className="border-b border-line p-4 sm:p-5">
              <h2 className="font-display text-lg font-semibold">Circulars</h2>
              <p className="text-sm text-ink-500">Loaded from `/announcements`.</p>
            </div>
            <div className="divide-y divide-line/60">
              {announcements.map((item, index) => (
                <motion.article
                  key={idOf(item) || textOf(item, ['title'])}
                  className="p-4 sm:p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold break-words">{textOf(item, ['title'])}</h3>
                      <p className="mt-1 text-sm text-ink-500 break-words">{textOf(item, ['content'])}</p>
                    </div>
                    <span className="chip-brand w-fit shrink-0">{textOf(item, ['audienceScope'])}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                    <span>{formatDate(textOf(item, ['createdAt'], ''))}</span>
                    <span>{fullName(item.authorId, 'Author not returned')}</span>
                  </div>
                </motion.article>
              ))}
              {!announcements.length && <Empty text={announcementsQuery.isLoading ? 'Loading announcements...' : 'No announcements returned.'} />}
            </div>
          </section>

          <section className="card min-w-0 overflow-hidden">
            <div className="border-b border-line p-4 sm:p-5">
              <h2 className="font-display text-lg font-semibold">Parent-teacher meetings</h2>
              <p className="text-sm text-ink-500">Loaded from `/communication/meetings`.</p>
            </div>
            <div className="grid min-w-0 gap-3 p-4 sm:p-5 md:grid-cols-2">
              {meetings.map((item) => (
                <div key={idOf(item)} className="min-w-0 rounded-2xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{fullName(item.teacherId, 'Teacher not returned')}</p>
                      <p className="mt-1 text-xs text-ink-400">{formatDate(textOf(item, ['meetingDate'], ''))}</p>
                    </div>
                    <span className={statusClass(textOf(item, ['status'], ''))}>{textOf(item, ['status'])}</span>
                  </div>
                  <p className="mt-3 text-sm text-ink-600 break-words">{textOf(item, ['agenda'])}</p>
                  <p className="mt-2 text-xs text-ink-400">Parent: {resolveParentLabel(item.parentId, students)}</p>
                </div>
              ))}
              {!meetings.length && <Empty text={meetingsQuery.isLoading ? 'Loading meetings...' : 'No meetings returned.'} />}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-2" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-400">{text}</p>;
}

function resolveParentLabel(parent: unknown, students: any[]) {
  const resolvedId = idOf(parent);
  const student = students.find((item) => item.id === resolvedId);
  if (student) {
    const name = `${student.firstName} ${student.lastName}`.trim();
    const phone = student.parentContact?.primaryPhone;
    return phone ? `${name} · ${phone}` : name;
  }
  return fullName(parent, 'Not returned');
}
