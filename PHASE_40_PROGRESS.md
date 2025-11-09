# Journey Planner - Phase 40 Progress Report

## ✅ Phase 1: Database Schema & Sequelize Models (COMPLETE)

### 📊 Database Schema Updates (database/init.sql)

#### 1. Payment Tracking System
- ✅ Added `is_paid BOOLEAN DEFAULT FALSE` to:
  - `stops` table (accommodation payments)
  - `transports` table (flight/train/bus payments)
  - `attractions` table (activity payments)
- **Purpose**: Track which costs are paid vs estimated
- **UI Feature**: "Opłacono" checkboxes + "Do zapłaty" column

#### 2. User Authentication System
- ✅ Created `users` table with fields:
  - `id`, `username` (unique), `email` (unique)
  - `password_hash` (TEXT for bcrypt hashes)
  - `role` ENUM ('admin', 'user') - role-based access control
  - `email_verified` BOOLEAN - email verification status
  - `verification_token` TEXT - for email confirmation
  - `reset_token` TEXT + `reset_token_expires` TIMESTAMP - password reset
  - Timestamps: `created_at`, `updated_at`
- **Purpose**: User login, admin features, email verification
- **Features**: JWT auth, forgot password, user management

#### 3. Transport File Attachments
- ✅ Created `transport_attachments` table with fields:
  - `id`, `transport_id` (FK to transports)
  - `filename` VARCHAR(255) - stored filename
  - `original_filename` VARCHAR(255) - user's original name
  - `file_path` TEXT - server path to file
  - `file_size` INTEGER - file size in bytes
  - `mime_type` VARCHAR(100) - file type (PDF, JPG, etc.)
  - `uploaded_by` (FK to users) - who uploaded the file
  - `uploaded_at` TIMESTAMP - upload timestamp
- **Purpose**: Store transport tickets, confirmations, boarding passes
- **Features**: Multiple attachments per transport, visible to all users

#### 4. User Relationships
- ✅ Added `created_by` INTEGER to `journeys` table
  - FK to `users(id)` with ON DELETE SET NULL
  - Track which user created each journey

#### 5. Performance Indexes
```sql
-- Transport attachments indexes
CREATE INDEX idx_transport_attachments_transport ON transport_attachments(transport_id);
CREATE INDEX idx_transport_attachments_uploader ON transport_attachments(uploaded_by);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Journey creator index
CREATE INDEX idx_journeys_creator ON journeys(created_by);
```

#### 6. Automatic Timestamp Triggers
```sql
-- User table updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 🔧 Sequelize Models (COMPLETE)

#### 1. Updated Existing Models (`server/src/models/Journey.ts`)

**StopAttributes Interface:**
```typescript
export interface StopAttributes {
  // ... existing fields ...
  isPaid?: boolean;  // ✅ NEW
}
```

**TransportAttributes Interface:**
```typescript
export interface TransportAttributes {
  // ... existing fields ...
  isPaid?: boolean;  // ✅ NEW
}
```

**AttractionAttributes Interface:**
```typescript
export interface AttractionAttributes {
  // ... existing fields ...
  isPaid?: boolean;  // ✅ NEW
}
```

**JourneyAttributes Interface:**
```typescript
export interface JourneyAttributes {
  // ... existing fields ...
  createdBy?: number;  // ✅ NEW - FK to users
}
```

**Updated Model Definitions:**
- ✅ All models now include `isPaid` / `is_paid` fields
- ✅ Journey model includes `createdBy` / `created_by` field
- ✅ All fields properly mapped to snake_case database columns

#### 2. New User Model (`server/src/models/User.ts`) ✅

```typescript
export interface UserAttributes {
  id?: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  emailVerified?: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes, UserCreationAttributes> {
  // Full implementation with Sequelize fields
}
```

**Features:**
- TypeScript strict typing
- Snake_case to camelCase mapping
- Password hashing support (bcrypt)
- Email verification tokens
- Password reset tokens with expiration
- Role-based access control

#### 3. New TransportAttachment Model (`server/src/models/TransportAttachment.ts`) ✅

```typescript
export interface TransportAttachmentAttributes {
  id?: number;
  transportId: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: number;
  uploadedAt?: Date;
}

export class TransportAttachment extends Model<TransportAttachmentAttributes, TransportAttachmentCreationAttributes> {
  // Full implementation with Sequelize fields
}
```

**Features:**
- File metadata storage
- User tracking (who uploaded)
- Automatic timestamp
- Cascade delete with transport

#### 4. Model Associations (`server/src/models/Journey.ts`) ✅

```typescript
// User associations
Journey.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Journey, { foreignKey: 'createdBy', as: 'journeys' });

// Transport attachment associations
Transport.hasMany(TransportAttachment, { foreignKey: 'transportId', as: 'attachments' });
TransportAttachment.belongsTo(Transport, { foreignKey: 'transportId', as: 'transport' });

TransportAttachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
User.hasMany(TransportAttachment, { foreignKey: 'uploadedBy', as: 'uploadedAttachments' });
```

#### 5. Models Index (`server/src/models/index.ts`) ✅

```typescript
export { Journey, Stop, Transport, Attraction } from './Journey';
export { User } from './User';
export { TransportAttachment } from './TransportAttachment';
```

---

### 🛠️ Backend Configuration

#### Sequelize Configuration (`server/src/config/database.ts`) ✅

```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'journey_planner',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectSequelize = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection successful!');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized!');
  } catch (error: any) {
    console.error('❌ Sequelize connection failed:', error.message);
    throw error;
  }
};

export default sequelize;
```

**Features:**
- Connection pooling (max 10 connections)
- Environment variable configuration
- Auto-sync with `alter: true` (updates existing tables)
- Comprehensive error handling

#### Dependencies Installed ✅

```json
{
  "dependencies": {
    "sequelize": "^6.37.5",
    "@types/sequelize": "^4.28.20"
  }
}
```

---

## 🎯 TypeScript Compilation Status

**Backend Compilation:** ✅ SUCCESS
```bash
npm run build
# Output: No errors!
```

**All TypeScript files compile successfully:**
- ✅ `server/src/models/Journey.ts` (updated)
- ✅ `server/src/models/User.ts` (new)
- ✅ `server/src/models/TransportAttachment.ts` (new)
- ✅ `server/src/models/index.ts` (new)
- ✅ `server/src/config/database.ts` (new)

---

## 📝 Next Steps (Remaining Tasks)

### Phase 2: Authentication System
- [ ] Create authentication middleware (`server/src/middleware/auth.ts`)
- [ ] JWT token generation and validation
- [ ] Password hashing with bcrypt
- [ ] Email verification service
- [ ] Password reset functionality
- [ ] Auth routes (`/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`)
- [ ] Auth controllers

### Phase 3: File Upload System
- [ ] Install Multer for file uploads
- [ ] Create upload directory structure
- [ ] File upload middleware
- [ ] Transport attachment routes (`POST /api/transports/:id/attachments`)
- [ ] File serving endpoints (`GET /api/attachments/:id`)
- [ ] File deletion functionality
- [ ] File size/type validation

### Phase 4: Frontend Authentication UI
- [ ] Login page component
- [ ] Registration page component
- [ ] Forgot password page
- [ ] JWT token storage (localStorage/cookie)
- [ ] Protected route wrapper
- [ ] Auth context provider
- [ ] Login/logout functionality

### Phase 5: Admin Panel
- [ ] Admin user management UI
- [ ] User list component
- [ ] Create user form
- [ ] Email invitation system
- [ ] User role management
- [ ] User deactivation/deletion

### Phase 6: Payment Tracking UI
- [ ] "Opłacono" checkboxes for stops
- [ ] "Opłacono" checkboxes for transports
- [ ] "Opłacono" checkboxes for attractions
- [ ] "Do zapłaty" calculation logic
- [ ] Journey summary with amount due
- [ ] Update API endpoints to handle isPaid

### Phase 7: Transport Management UI
- [ ] Edit button for transports
- [ ] Delete button for transports
- [ ] Transport edit modal/form
- [ ] Confirmation dialogs
- [ ] File attachment upload UI
- [ ] Attachment list display
- [ ] Attachment download/view

### Phase 8: Docker & Deployment
- [ ] Create Docker volume for attachments
- [ ] Update docker-compose.yml
- [ ] Environment variable documentation
- [ ] Deployment guide updates
- [ ] Production build testing

### Phase 9: Email Service
- [ ] Install Nodemailer
- [ ] Email templates (verification, password reset, invitation)
- [ ] SMTP configuration
- [ ] Email sending service
- [ ] Rate limiting for emails

### Phase 10: Security & Testing
- [ ] Rate limiting middleware
- [ ] Input validation
- [ ] SQL injection prevention (Sequelize handles this)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Security headers
- [ ] End-to-end testing

---

## 🔐 Security Considerations

**Password Storage:**
- Use bcrypt with salt rounds ≥ 10
- Never store plain text passwords
- Hash passwords before database insert

**JWT Tokens:**
- Store in httpOnly cookies (not localStorage for production)
- Use secure flag in production
- Implement token refresh mechanism
- Set reasonable expiration (e.g., 1 hour access, 7 days refresh)

**File Uploads:**
- Validate file types (whitelist approach)
- Limit file sizes (e.g., max 10MB)
- Sanitize filenames
- Store files outside public directory
- Use unique filenames (UUID + original name)

**Email Verification:**
- Use cryptographically secure random tokens
- Set token expiration (e.g., 24 hours)
- One-time use tokens

**Rate Limiting:**
- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- Email sending: 10 per hour

---

## 📦 Environment Variables Required

```bash
# Existing
DB_HOST=localhost
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=secure_password

# New - Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# New - Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@journeyplanner.com

# New - File Uploads
UPLOAD_DIR=./uploads/attachments
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=application/pdf,image/jpeg,image/png,image/jpg

# New - App
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🚀 Testing the Current Setup

### 1. Database Schema Test
```bash
# Connect to PostgreSQL
docker exec -it journey-planner-db psql -U journey_user -d journey_planner

# Check tables
\dt

# Expected output:
#  public | attractions           | table
#  public | journeys              | table
#  public | stops                 | table
#  public | transports            | table
#  public | transport_attachments | table  ← NEW
#  public | users                 | table  ← NEW

# Check users table structure
\d users

# Check is_paid columns
\d stops
\d transports
\d attractions
```

### 2. Sequelize Sync Test
```bash
cd server
npm run dev

# Expected console output:
# ✅ Sequelize connection successful!
# ✅ Database models synchronized!
```

### 3. TypeScript Compilation Test
```bash
cd server
npm run build

# Expected: No errors
```

---

## 📊 Progress Summary

**Phase 40 Completion: ~40%**

✅ **Completed (40%):**
- Database schema with users, payments, attachments
- Sequelize models (User, TransportAttachment)
- Updated existing models with isPaid and createdBy
- Model associations and relationships
- Database indexes and triggers
- TypeScript interfaces
- Sequelize configuration
- Successful backend compilation

🔄 **In Progress (0%):**
- Nothing currently in progress

⏳ **Pending (60%):**
- Authentication system (JWT, bcrypt, middleware)
- File upload system (Multer, storage)
- Frontend auth UI (login, register, forgot password)
- Admin panel (user management)
- Payment tracking UI (checkboxes, calculations)
- Transport edit/delete functionality
- File attachment UI
- Email service (Nodemailer, templates)
- Docker volume configuration
- Security hardening and testing

---

## 🎓 Key Design Decisions

1. **Sequelize ORM**: Chosen for type-safe database operations and easier migrations
2. **JWT Authentication**: Stateless authentication for API
3. **bcrypt Password Hashing**: Industry standard for secure password storage
4. **File System Storage**: Simple file storage with database metadata (could upgrade to S3 later)
5. **Role-Based Access Control**: Simple admin/user roles, extensible to more roles
6. **Email Verification**: Important for password reset security
7. **Timestamps Everywhere**: Full audit trail of user actions
8. **Payment Tracking**: Simple boolean flag, can be extended to payment history

---

## 📚 API Endpoints to Implement

### Authentication
```
POST   /api/auth/register          - Register new user (admin only)
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password    - Reset password with token
POST   /api/auth/verify-email      - Verify email with token
GET    /api/auth/me                - Get current user info
```

### User Management (Admin Only)
```
GET    /api/users                  - List all users
GET    /api/users/:id              - Get user details
POST   /api/users                  - Create new user
PUT    /api/users/:id              - Update user
DELETE /api/users/:id              - Delete user
POST   /api/users/invite           - Send invitation email
```

### Transport Attachments
```
POST   /api/transports/:id/attachments        - Upload attachment
GET    /api/transports/:id/attachments        - List attachments
GET    /api/attachments/:id                   - Get attachment file
DELETE /api/attachments/:id                   - Delete attachment
```

### Payment Tracking (Updates to existing endpoints)
```
PUT    /api/stops/:id               - Update isPaid flag
PUT    /api/transports/:id          - Update isPaid flag
PUT    /api/attractions/:id         - Update isPaid flag
GET    /api/journeys/:id/summary    - Get journey with amount due calculation
```

---

## 🎉 What's Working Now

✅ **Database Structure:**
- All tables created with proper relationships
- Payment tracking columns ready
- User authentication fields ready
- File attachment metadata storage ready

✅ **Backend TypeScript:**
- All models compile successfully
- Type-safe database operations
- Proper associations between models

✅ **Development Environment:**
- Sequelize configured and ready
- PostgreSQL connection working
- Environment variables set up

---

**Ready for Phase 2: Authentication Implementation! 🚀**

---

*Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*
