# Inventory Management System — Authentication

Complete JWT authentication system for the Inventory Management System.

| Layer | Technology |
|-------|-----------|
| Frontend | Angular (Standalone Components) + Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | TypeORM |
| Image storage | Cloudinary |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`) |
| Password hashing | bcrypt |
| File upload | `multer` (`FileInterceptor`, memory storage) |

---

## 1. Folder Structure

```
ims/
├── inventory-api/                          # NestJS backend
│   ├── .env
│   ├── src/
│   │   ├── main.ts                         # Bootstrap: CORS + ValidationPipe
│   │   ├── app.module.ts                   # Root module (Config, TypeORM, Auth)
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts            # email + password validation
│   │   │   │   └── register.dto.ts         # username + email + password validation
│   │   │   ├── auth.controller.ts          # POST /auth/register, /auth/login, GET profile
│   │   │   ├── auth.service.ts             # bcrypt hash/compare + JWT sign
│   │   │   ├── auth.module.ts              # JwtModule (registerAsync), PassportModule
│   │   │   ├── jwt.strategy.ts             # passport-jwt validation of Bearer token
│   │   │   ├── jwt-auth.guard.ts           # protects routes (AuthGuard('jwt'))
│   │   │   ├── roles.guard.ts              # role-based authorization
│   │   │   ├── roles.decorator.ts          # @Roles('admin')
│   │   │   └── current-user.decorator.ts   # @CurrentUser() param decorator
│   │   ├── users/
│   │   │   ├── user.entity.ts              # users table (TypeORM entity)
│   │   │   ├── users.service.ts            # findById / findByEmail / create
│   │   │   └── users.module.ts
│   │   └── cloudinary/
│   │       ├── cloudinary.module.ts
│   │       └── cloudinary.service.ts       # upload_stream → secure_url
│   └── test/
│
└── inventory-client/                       # Angular frontend
    └── src/app/
        ├── core/
        │   ├── guards/auth.guard.ts        # blocks unauthenticated routes
        │   ├── interceptors/jwt.interceptor.ts # adds Bearer header, handles 401
        │   └── models/auth.model.ts        # AuthUser, AuthResponse
        ├── features/auth/
        │   ├── auth.service.ts             # login / register(FormData) / logout
        │   ├── login/login.component.*     # login UI (Tailwind)
        │   └── register/register.component.* # register UI + image upload preview
        └── shared/
```

---

## 2. Database Table (`users`)

```sql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR NOT NULL,
  email       VARCHAR NOT NULL UNIQUE,
  password    VARCHAR NOT NULL,
  image       VARCHAR NULL,          -- Cloudinary URL
  role        VARCHAR DEFAULT 'user', -- 'admin' | 'user'
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

The table is created automatically by TypeORM (`synchronize: true`, dev only).

---

## 3. Environment Variables (`.env`)

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ims

JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=1d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 4. Step-by-step Installation

### 4.1 Prerequisites
- Node.js ≥ 20
- PostgreSQL running locally
- A Cloudinary account (free) — get `cloud_name`, `api_key`, `api_secret` from the dashboard

### 4.2 Create the database
```sql
CREATE DATABASE ims;
```

### 4.3 Backend (`inventory-api`)
```bash
cd inventory-api
npm install
npm install -D @types/multer          # for Express.Multer.File types
# fill in your .env values (see section 3)
npm run start:dev                      # http://localhost:3000
```

### 4.4 Frontend (`inventory-client`)
```bash
cd inventory-client
npm install
npm start                              # http://localhost:4200
```

Open http://localhost:4200 → `/login` and `/register`.

> CORS is already enabled for `http://localhost:4200` and `http://localhost:4201`
> in `inventory-api/src/main.ts`.

---

## 5. API Endpoints

| Method | Endpoint            | Body / Form              | Access          | Description                          |
|--------|---------------------|--------------------------|-----------------|--------------------------------------|
| POST   | `/auth/register`    | `multipart/form-data`    | public          | Create user + upload image           |
| POST   | `/auth/login`       | `{ email, password }`    | public          | Verify password → return JWT + user  |
| GET    | `/auth/profile`     | —                        | `JwtAuthGuard`  | Current logged-in user               |
| GET    | `/auth/admin-only`  | —                        | `JwtAuthGuard` + `RolesGuard(@Roles('admin'))` | Admin-only demo endpoint |

**Register** request (multipart):
```
POST /auth/register
Content-Type: multipart/form-data

username : sok
email    : sok@example.com
password : secret123
image    : (file, optional, max 5MB, image/* only)
```

**Register** response (201):
```json
{
  "id": 1,
  "username": "sok",
  "email": "sok@example.com",
  "image": "https://res.cloudinary.com/.../inventory/users/xxx.jpg",
  "role": "user",
  "createdAt": "2026-08-12T04:54:33.709Z",
  "updatedAt": "2026-08-12T04:54:33.709Z"
}
```

**Login** request:
```json
{ "email": "sok@example.com", "password": "secret123" }
```

**Login** response (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "sok", "email": "sok@example.com", "image": "...", "role": "user" }
}
```

---

## 6. Testing with Postman

1. **Register**
   - Method: `POST`, URL: `http://localhost:3000/auth/register`
   - `Body` tab → `form-data`
   - Add fields: `username`, `email`, `password`
   - Add file: key `image`, click the *File* dropdown, choose an image
   - Send → expect `201 Created` with the user JSON.

2. **Login**
   - Method: `POST`, URL: `http://localhost:3000/auth/login`
   - `Body` tab → `raw` → `JSON`
   - Paste `{ "email": "...", "password": "..." }`
   - Send → copy `access_token` from the response.

3. **Protected route with JWT**
   - Method: `GET`, URL: `http://localhost:3000/auth/profile`
   - `Authorization` tab → `Type: Bearer Token` → paste the token
   - Send → `200` with the user object.
   - Without the token → `401 Unauthorized`.

4. **Role check**
   - `GET http://localhost:3000/auth/admin-only`
   - With a `user` role token → `403 Forbidden`
   - Change the user's role to `admin` in the DB (`UPDATE users SET role='admin' WHERE email=...;`), log in again → `200`.

5. **Validation**
   - Register with an invalid email or a password shorter than 6 chars → `400 Bad Request` with `class-validator` messages.
   - Register twice with the same email → `409 Conflict`.

---

## 7. How Each Part Works (Khmer)

### 7.1 User Entity (`user.entity.ts`) — តារាងអ្នកប្រើ
Entity គឺជាការកំណត់តារាង `users` នៅក្នុង PostgreSQL ដោយប្រើ TypeORM ។
- `@Entity('users')` ប្រាប់ TypeORM ថាវាជាតារាងមួយ ។
- `@PrimaryGeneratedColumn()` id បង្កើតលេខស្វ័យប្រវត្តិ (auto increment) ។
- `@Column({ unique: true })` ធ្វើឲ្យ email មិនអាចផ្ដិតបាន (unique) ។
- `@CreateDateColumn` / `@UpdateDateColumn` កត់ត្រាពេលបង្កើត និងពេលកែចុងក្រោយ ដោយស្វ័យប្រវត្តិ ។
- យើងកំណត់ `type: 'varchar'` ច្បាស់លាស់ ព្រោះប្រសិនបើ property មានប្រភេទ `string | null` (union type) TypeORM មិនអាចស្គាល់ប្រភេទ column បានទេ ។

### 7.2 DTO Validation (login.dto.ts / register.dto.ts) — ពិនិត្យទិន្នន័យបញ្ចូល
DTO (Data Transfer Object) គឺជា class សម្រាប់កំណត់រូបរាងទិន្នន័យចូល និងពិនិត្យវាដោយ `class-validator` ៖
- `@IsEmail()` ពិនិត្យថាជាអ៊ីមែលត្រឹមត្រូវ ។
- `@IsString()` / `@IsNotEmpty()` ពិនិត្យថាជាអក្សរ និងមិនទទេ ។
- `@MinLength(6)` ពិនិត្យថាពាក្យសម្ងាត់យ៉ាងតិច 6 តួ ។
- `main.ts` ដាក់ `app.useGlobalPipes(new ValidationPipe(...))` ដើម្បីប្រើវាលើ API ទាំងអស់; បើខុសវាត្រឡប់ `400 Bad Request` ជាមួយ message ដោយស្វ័យប្រវត្តិ ។

### 7.3 Cloudinary Service (cloudinary.service.ts) — ផ្ទុករូបភាព
- នៅក្នុង constructor យើង config Cloudinary ជាមួយ `cloud_name`, `api_key`, `api_secret` ពី `.env` ។
- `uploadImage(file)` ប្រើ `cloudinary.uploader.upload_stream(...)` ដែលទទួល file buffer (បានពី `memoryStorage` របស់ multer) ផ្ទុកឡើងទៅ folder `inventory/users` ហើយត្រឡប់ `secure_url` ដែលយើងរក្សាទុកក្នុងតារាង users ។

### 7.4 Register Flow — ដំណើរការចុះឈ្មោះ
1. Angular ផ្ញើ `FormData` (username, email, password, image) ទៅ `POST /auth/register` ។
2. `AuthController` ប្រើ `@UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), fileFilter }))` :
   - `memoryStorage()` ទុក file ក្នុង memory បណ្ដោះអាសន្ន ។
   - `fileFilter` បដិសេធ file ដែលមិនមែនជារូបភាព (non-image) ។
   - `@Body()` ទទួល fields ផ្សេងទៀតជា `RegisterDto`; `@UploadedFile()` ទទួលរូបភាព ។
3. `AuthService.register()` ពិនិត្យ email ផ្ដិតរួចហើយឬអត់ → បើផ្ដិតរួចហើយឲ្យ `409 Conflict` ។
4. ផ្ទុករូបភាពទៅ Cloudinary បាន `secure_url` ។
5. Hash password ដោយ `bcrypt.hash(password, 10)` (10 = salt rounds) — យើងមិនដែលរក្សាទុក password ដែលច្បាស់ក្នុង DB ឡើយ ។
6. រក្សាទុក user ក្នុង DB រួចត្រឡប់ user (មិនរាប់ password) ។

### 7.5 Login Flow — ដំណើរការចូលប្រើ
1. Client ផ្ញើ `{ email, password }` ទៅ `POST /auth/login` ។
2. `AuthService.login()` រក user តាម email; បើរកមិនឃើញ → `401 Unauthorized` ។
3. ប្រៀបធៀប password ដោយ `bcrypt.compare(password, hash)` — bcrypt ជា hashing មួយទិស (one-way) ដូច្នេះយើងតែងតែប្រៀបធៀបតាម hash មិនអាច decrypt បានទេ ។
4. បើត្រឹមត្រូវ បង្កើត JWT payload `{ sub: user.id, email, role }` ហើយ sign ដោយ `JwtService` (secret ពី `.env`) ។
5. ត្រឡប់ `{ access_token, user }` ។

### 7.6 JWT Strategy & Guard (jwt.strategy.ts / jwt-auth.guard.ts) — ការពារផ្លូវ API
- `JwtStrategy` extends `PassportStrategy(Strategy)` ត្រូវបានហៅរាល់ពេលដែលមាន request ចូលទៅ route ដែលប្រើ `JwtAuthGuard` ។
- វាទាញ token ពី header `Authorization: Bearer <token>` ផ្ទៀងផ្ទាត់ signature និង expiry ជាមួយ secret ដដែលដែលប្រើ sign ។
- `validate(payload)` ទាញយក user ពី DB តាម `payload.sub` រួចដាក់វានៅលើ `request.user` (ដើម្បីប្រើបន្តក្នុង controller) ។
- `@UseGuards(JwtAuthGuard)` នៅលើ route ណាដែលយើងចង់ការពារ; គ្មាន token ត្រឹមត្រូវ → `401` ។
- ការព្រមានសំខាន់: secret ត្រូវតែអានតាម `ConfigService` ទាំងសងខាង (JwtModule + JwtStrategy) ព្រោះ `.env` ត្រូវបាន load នៅពេល bootstrap មិនមែនពេល import module ទេ ។

### 7.7 Role-based Authorization (roles.decorator.ts / roles.guard.ts) — ការកំណត់សិទ្ធិតាមតួនាទី
- `@Roles('admin')` គឺជា custom decorator ដែលដាក់ metadata លើ route ។
- `RolesGuard` អាន metadata នោះ រួចពិនិត្យ `request.user.role`:
  - អត់មាន `@Roles(...)` → អនុញ្ញាតទាំងអស់ ។
  - មាន `@Roles('admin')` តែ user ជា `user` → `403 Forbidden` ។
- ការប្រើ៖ `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` — guard ទីមួយផ្ទៀងផ្ទាត់ token, ទីពីរផ្ទៀងផ្ទាត់តួនាទី ។

### 7.8 Angular Auth Service (auth.service.ts) — សេវាកម្មភ្ជាប់ API
- `login(email, password)` ហៅ `POST /auth/login` ហើយពេលទទួលបាន រក្សាទុក `access_token` និង `user` ក្នុង `localStorage` ។
- `register(formData)` ផ្ញើ FormData ទៅ `POST /auth/register` (HttpClient កំណត់ Content-Type ដោយស្វ័យប្រវត្តិជាមួយ boundary) ។
- `isAuthenticated()` ពិនិត្យថាមាន token ក្នុង localStorage ឬអត់ ។
- `logout()` លុប session ហើយបញ្ជូនទៅ `/login` ។

### 7.9 Auth Guard (core/guards/auth.guard.ts) — ការពារ Route ផ្នែក Frontend
- ជា functional guard ដែលភ្ជាប់លើ route ក្រោម `AdminLayoutComponent` ។
- បើ `isAuthenticated()` ត្រឡប់ `true` → អនុញ្ញាតចូល dashboard និងផ្លូវផ្សេងទៀត ។
- បើគ្មាន token → បង្វែរទៅ `/login` ដោយ `router.createUrlTree(['/login'])` ។

### 7.10 JWT Interceptor (core/interceptors/jwt.interceptor.ts) — បញ្ចូល Token ដោយស្វ័យប្រវត្តិ
- គឺជា `HttpInterceptorFn` ដែលដំណើរការលើគ្រប់ HTTP request ចេញពី app ។
- បើមាន token → បញ្ចូល header `Authorization: Bearer <token>` ដោយស្វ័យប្រវត្តិ (មិនបាច់សរសេររាល់កន្លែងទេ) ។
- បើ server ត្រឡប់ `401` → លុប session ហើយបញ្ជូនទៅ `/login` ។
- ចុះឈ្មោះនៅក្នុង `app.config.ts` តាម `provideHttpClient(withInterceptors([jwtInterceptor]))` ។

### 7.11 Register / Login Components — ផ្នែក UI
- **Login page**: card នៅកណ្ដាល មាន email, password (show/hide), remember me, button, និងការបង្ហាញ error ពី server ។ បន្ទាប់ពី login ជោគជ័យ → បង្វែរទៅ `/dashboard` ។
- **Register page**: username, email, password, confirm password, និងការ upload រូបភាពជាមួយ preview (`FileReader.readAsDataURL`) និងការពិនិត្យប្រភេទ file (image/*) ។ បន្ទាប់ពី register ជោគជ័យ → បង្វែរទៅ `/login` ។
- ប្រើ `ReactiveFormsModule` ជាមួយ `Validators` (required, email, minLength) និង validation ដែលបង្ហាញជាភាសាអង់គ្លេសក្រោម field នីមួយៗ ។

### 7.12 Header (header.component.ts) — បង្ហាញអ្នកប្រើ + Logout
- អាន user ពី `AuthService.getUser()` បង្ហាញ avatar (រូបពី Cloudinary ឬ placeholder), username និង role ។
- ជ្រើស "Sign Out" → ហៅ `AuthService.logout()` ដែលលុប session ហើយបង្វែរទៅ `/login` ។

---

## 8. Scripts

Backend (`inventory-api`):
```bash
npm run start:dev   # watch mode
npm run build       # compile
npm run lint        # eslint --fix
```

Frontend (`inventory-client`):
```bash
npm start           # dev server on :4200
npm run build       # production build
```

## 9. Security Notes
- Passwords are never stored in plain text (bcrypt, salt = 10 rounds).
- JWT expires after `1d` (configurable via `.env`).
- Only `image/*` files are accepted, max 5 MB.
- Protected routes reject requests without a valid Bearer token.
- Keep `JWT_SECRET` and Cloudinary credentials out of source control.
