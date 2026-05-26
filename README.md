# Schoolmate — School Admin (Web)

Day-to-day school operations: admissions, students, classes, attendance, exams, fees, transport, library, sports, communication, analytics.

## Run

```bash
npm install
cp .env.example .env
npm run dev    # http://localhost:5174
npm run build
```

## Routes

| Path             | Page          | Primary endpoints                            |
| ---------------- | ------------- | -------------------------------------------- |
| `/login`         | Sign-in       | `POST /auth/login`                           |
| `/`              | Dashboard     | `GET /analytics/school-dashboard`            |
| `/admissions`    | Admissions    | `GET/POST /admissions/applications`          |
| `/students`      | Students      | `GET/POST/PUT/DELETE /students`              |
| `/staff`         | HR            | `GET/POST/PUT /hr/employees`, payroll        |
| `/classes`       | Classes       | `GET/POST /classes`                          |
| `/timetable`     | Timetable     | `GET /timetable/class/{c}/section/{s}`       |
| `/attendance`    | Attendance    | `POST /attendance/record`                    |
| `/homework`      | Homework      | `GET/POST /homework`, submissions, evaluate  |
| `/exams`         | Exams & marks | `POST /exams`, schedules, marks, report-card |
| `/fees`          | Fees & cash   | `/fees/*`, daily cash ledger                 |
| `/library`       | Library       | `GET/POST /library/books`, issues/returns    |
| `/transport`     | Transport     | routes, vehicles, drivers, allocations       |
| `/sports`        | Sports        | `GET/POST /sports`, assign/unassign          |
| `/announcements` | Comms         | `GET/POST /announcements`                    |
| `/analytics`     | Analytics     | `GET /analytics/school-dashboard`            |
| `/settings`      | Settings      | local                                        |

All requests carry `Authorization: Bearer <JWT>` + `X-School-ID: <objectId>` automatically.
