# National Audit Academy — Learning Management System

A Udemy-style LMS for the National Audit Academy: students browse and enroll in courses, watch lessons sequentially with server-enforced anti-skip progress tracking, and earn certificates on completion. Teachers build courses with a resumable large-video upload pipeline. Admins review, approve, and publish courses and manage users.

## Architecture

```
backend/    Django 5 + Django REST Framework + SimpleJWT (existing codebase, extended)
frontend/   Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Query
```

- **Auth**: JWT (access + refresh) via `djangorestframework-simplejwt`. The access token carries `role` and `teacher_id` claims so the frontend can route without an extra request.
- **Roles**: `Student` / `Teacher` / `Admin`, stored as an explicit `role` field on the custom `User` model (`userauths` app). Every protected endpoint enforces the real check server-side via `api/permissions.py` — frontend route guards (`RequireRole`) are UX only, not a security boundary.
- **Video storage (Phase 1)**: local disk under `backend/media/`, uploaded via a hand-rolled resumable/chunked protocol (`init` → repeated `chunk` → `complete`) so a 1GB+ file never depends on one HTTP request surviving. See `api/models.py: VideoUploadSession` and `api/views.py: VideoUpload*APIView`. `boto3`/`django-storages` are present in `requirements.txt` for a future move to real object storage but are not wired up.
- **Video playback security**: lesson videos are never served from a public `MEDIA_URL`. The frontend requests a short-lived signed URL (`VideoAccessAPIView`, enrollment-checked) and streams from `VideoStreamAPIView`, which validates the signature and serves HTTP Range requests for seeking.
- **Anti-skip / progress**: the server (`LessonProgressAPIView`) is the sole source of truth. It clamps any reported position to `max_watched_position + tolerance`, computes completion from the server-measured video duration, and drives sequential lesson locking. A course's completion and certificate issuance are both server-triggered, never client-triggered.
- **Course workflow**: `Draft → Review → Published`, with `Rejected` (teacher can revise and resubmit) and `Disabled` (admin unpublish) as the other two `platform_status` values.

## Prerequisites

- Python 3.11+ (a `.venv` already exists in `backend/`)
- Node.js 20+
- FFmpeg is not required as a system dependency — `moviepy` bundles its own via `imageio-ffmpeg`.

## Backend setup

```bash
cd backend
.venv/Scripts/activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # then fill in real values
python manage.py migrate
python manage.py createsuperuser   # creates an Admin (role auto-syncs to Admin on save)
python manage.py runserver
```

The API is served at `http://127.0.0.1:8000/api/v1/`. Django admin is at `/admin/`.

### Environment variables (backend)

See `backend/.env.example` for the full list with comments. Django reads `backend/.env` first and only falls back to `backend/venv/.env` if that file doesn't exist — prefer `backend/.env`.

### Promoting a user to Teacher or Admin

Public registration (`/user/register/`) always creates a `Student`. Teachers and Admins are provisioned by an existing Admin, either through:

- The frontend: `/admin/users` → Create User (pick a role), or change an existing user's role inline (promoting to `Teacher` auto-creates their `Teacher` profile row).
- Django admin (`/admin/`) or `manage.py shell`, setting `user.role` and saving.

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local    # defaults already point at the local backend
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment variables (frontend)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Django API base URL, e.g. `http://127.0.0.1:8000/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Display name used in a couple of places |

## Running tests

**Backend** (28 tests covering auth/roles, IDOR protection, course review workflow, enrollment, anti-skip progress + completion + certificate issuance, video access control, admin user management, and a dedicated regression suite for the sensitive-data-leak fix described below):

```bash
cd backend
.venv/Scripts/python manage.py test api userauths
```

**Frontend E2E** (Playwright, drives a real browser against a running backend — start `manage.py runserver` first):

```bash
cd frontend
npm run test:e2e
```

Three specs live in `frontend/e2e/`:
- `golden-path.spec.ts` — student registers, browses/searches, enrolls, reaches the learning player.
- `teacher-course-flow.spec.ts` — teacher creates a course, uploads a real generated video through the resumable pipeline, submits for review. Requires a teacher account `e2e_teacher@example.com` / `Str0ngPass!123` (create via `manage.py shell`, see "Promoting a user" above).
- `admin-review-flow.spec.ts` — admin approves a pending course. Requires an admin account `e2e_admin@example.com` / `Str0ngPass!123`.

## Known limitations (Phase 1 scope)

- Video storage is local disk, not real object storage (S3/MinIO) — see the storage note above.
- No HLS transcoding or multiple resolutions; lessons stream the original uploaded file directly with Range support.
- No Celery/Redis background job queue; video processing (duration extraction) happens synchronously on upload completion.
- Notifications exist as a backend model (`Notification`) but have no dedicated frontend UI yet.
- No payment/pricing — matches the spec; courses are free to enroll in.

## A note on a real vulnerability found and fixed during this build

The original codebase's serializers each set `Meta.depth = 3` for GET-style requests. DRF's automatic depth-based nesting builds a full, unrestricted representation of every related model — which meant public, unauthenticated endpoints like the course catalog were returning every teacher's **password hash, OTP, and refresh token** nested under `course.teacher.user`. This has been fixed (`api/serializer.py`: every `Meta.depth` is now `0`, with the specific nested data actually needed by the frontend — course details, teacher name, etc. — added back via explicit, restricted serializer fields) and is covered by a permanent regression suite (`api/tests.py: SensitiveDataLeakTests`).

## Deployment notes

- Set `DEBUG=False` and a real `SECRET_KEY` in production.
- Point `MEDIA_ROOT`/storage at real object storage before accepting production video uploads — local disk does not survive redeploys on most hosting platforms and won't scale past one app instance.
- Serve the Next.js app with `npm run build && npm run start`, or deploy to a platform that runs `next build` for you (e.g. Vercel).
