# Appliance Stock Backend

Express + OracleDB backend for Smart Home Appliances — **Region / Vendor / Branch / Model**
inventory master data, plus a bcrypt-backed **user login** module.

Structure mirrors the sample backend you shared (config / database / middleware / utils /
controllers / services / routes), calling PL/SQL procedures for every read/write instead of
inline SQL.

## 1. Folder structure

```
appliance-stock-backend/
├── server.js                     # entry point — validates env, opens Oracle pool, starts HTTP server
├── db/
│   ├── 00_helper_function_currentdatetime.sql   # optional fallback for currentdatetime()
│   ├── 01_region_vendor_branch_model_schema.sql # your v2 script, unmodified
│   └── 02_userslogin_schema.sql                 # new: users/login table + procedures
├── scripts/
│   └── seedAdmin.js               # one-time: creates the first ADMIN user (bcrypt hash)
├── postman/
│   └── Appliance-Stock-Backend.postman_collection.json
└── src/
    ├── app.js                     # express app (helmet, cors, morgan, cookies, routes)
    ├── config/
    │   ├── env.js                 # Joi-validated environment variables
    │   └── logger.js
    ├── constants/httpStatus.js
    ├── database/oraclePool.js     # pool + withConnection/withTransaction helpers
    ├── middleware/
    │   ├── auth.middleware.js     # JWT (httpOnly cookie) verification
    │   ├── role.middleware.js     # requireRole('ADMIN', ...) guard
    │   ├── response.middleware.js # res.success() / res.fail() helpers
    │   ├── errorHandler.middleware.js
    │   └── notFound.middleware.js
    ├── utils/
    │   ├── ApiError.js
    │   ├── asyncHandler.js
    │   ├── jwt.util.js
    │   └── password.util.js       # bcrypt hash/compare
    ├── controllers/   (auth, user, health, region, vendor, branch, model)
    ├── services/      (same six, one PL/SQL call per function)
    └── routes/        (same six + index.js mounting them under /api/v1)
```

## 2. Database setup

Run in this order against your Oracle 11g schema:

1. `db/00_helper_function_currentdatetime.sql` — **only if** your DB doesn't already have a
   `currentdatetime()` function (the v2 procedures call it instead of `SYSDATE` directly).
2. `db/01_region_vendor_branch_model_schema.sql` — your script, exactly as provided.
3. `db/02_userslogin_schema.sql` — new `userslogin` table + procedures.

### Why `userslogin` doesn't hash passwords in SQL
Oracle 11g has no built-in bcrypt. Hashing happens in Node (`bcrypt`, 12 salt rounds) — the
database only ever stores/compares an already-hashed string. Because of this, there's no way
to seed the first admin account with pure SQL, which is what `scripts/seedAdmin.js` is for.

### `userslogin` columns
| column      | notes                                              |
|-------------|-----------------------------------------------------|
| userid      | PK, `seq_userslogin`                                 |
| username    | unique (case-insensitive)                            |
| password    | bcrypt hash — **never** plaintext                    |
| status      | 0 Active / 1 Inactive (soft-deleted)                  |
| loginstatus | 0 Logged Out / 1 Logged In — flipped on login/logout  |
| userrole    | `ADMIN` or `USER`                                     |
| createdby / editby | same `'<user> \| <DD-MON-YYYY HH24:MI:SS>'` convention as the other tables |

## 3. Install & configure

```bash
cp .env.example .env
# edit .env — at minimum set JWT_SECRET, DB_USER, DB_PASSWORD, DB_CONNECT_STRING

npm install
```

Bootstrap the first admin account (after running `02_userslogin_schema.sql`):

```bash
npm run seed:admin
# or explicitly:
node scripts/seedAdmin.js myadmin "SomeStrongPassword123"
```

Run the server:

```bash
npm run dev     # nodemon
npm start        # plain node
```

Server listens on `PORT` (default `4000`), all routes under `/api/{API_VERSION}` (default `/api/v1`).

## 4. Auth model

- **Login** (`POST /auth/login`) checks `username`/`password` against `userslogin`
  (bcrypt-compare), and on success issues a JWT in an **httpOnly cookie** (`accessToken`) and
  sets `loginstatus = 1`.
- Every region/vendor/branch/model/user route requires that cookie (`authenticate` middleware).
- `/user/*` (admin user management: create/edit/list/delete users) additionally requires
  `req.user.role === 'ADMIN'` (`requireRole('ADMIN')` middleware).
- **Change password** (`POST /auth/change-password`, any logged-in user) verifies the caller's
  *current* password with bcrypt before hashing and saving the new one — admins don't set other
  users' passwords directly; they only manage `username` / `userrole` / `status` via `/user/add-edit`.
- **Logout** (`POST /auth/logout`) clears the cookie and sets `loginstatus = 0`.

## 5. API summary

All responses follow: `{ success, code, message, data }` on success, `{ success:false, code, message, details? }` on failure.

| Method | Path                       | Auth        | Notes |
|--------|----------------------------|-------------|-------|
| GET    | /health                    | none        | liveness check |
| POST   | /auth/login                | none        | body: `{ username, password }` |
| POST   | /auth/logout               | cookie      | |
| POST   | /auth/change-password      | cookie      | body: `{ currentPassword, newPassword }` |
| POST   | /user/add-edit             | ADMIN       | body: `{ vuserid, vusername, vpassword, vuserrole, vstatus }` — `vuserid: null` = create |
| GET    | /user/get-all              | ADMIN       | excludes password hashes |
| DELETE | /user/:id                  | ADMIN       | soft delete; can't delete yourself |
| POST   | /region/add-edit           | cookie      | body: `{ vregionid, vregionname, vstatus }` |
| GET    | /region/get-all            | cookie      | active only (status = 0) |
| DELETE | /region/:id                | cookie      | soft delete |
| POST   | /vendor/add-edit           | cookie      | body: `{ vvendorid, vcompany, vcontact, vphone, vemail, vaddress, vstatus }` |
| GET    | /vendor/get-all            | cookie      | |
| DELETE | /vendor/:id                | cookie      | |
| POST   | /branch/add-edit           | cookie      | body: `{ vbranchid, vbranchname, vregionid, vaddress, vstatus }` |
| GET    | /branch/get-all            | cookie      | includes joined `regionname` |
| DELETE | /branch/:id                | cookie      | |
| POST   | /model/add-edit            | cookie      | body: `{ vmodelid, vvendorid, vregionid, vmodelname, vmodelcode, vmrp, vcash, vhscode, vstatus }` |
| GET    | /model/get-all             | cookie      | includes joined `company` + `regionname` |
| DELETE | /model/:id                 | cookie      | |

For add/edit endpoints: pass `null`/omit a field on **update** to keep its current DB value
(the v2 procedures use `NVL(new, current)`); on **create**, pass the id field as `null`.

## 6. Postman

Import `postman/Appliance-Stock-Backend.postman_collection.json`. It has folders for
Health / Auth / User / Region / Vendor / Branch / Model, with example bodies for every
add/edit call and collection variables (`regionId`, `vendorId`, `branchId`, `modelId`, `userId`)
to chain requests. Run **Auth → Login** first — Postman's cookie jar carries the `accessToken`
cookie to every subsequent request automatically.

## 7. What's intentionally simplified

- No refresh-token rotation — a single JWT cookie with an 8h expiry (`JWT_EXPIRES_IN`).
- Role model is a flat `ADMIN` / `USER` string, not a permissions table — enough for the
  four inventory modules here; extend `role.middleware.js` if you need finer-grained access later.
