
# Ex-Employee Verification Portal

A secure and comprehensive employee verification system built with Next.js, MongoDB, and multiple email providers. This portal allows authorized external organizations (BGV agencies, future employers) to verify employment details of ex-employees with features for appeal submission, PDF report generation, and automated email notifications.

## 🚀 Features

### For Verifiers
- **Secure Registration**: Company email-based account creation with personal email blocking
- **Multi-Step Verification**: Intuitive wizard for submitting verification requests
- **Real-time Comparison**: Instant visual feedback with match/mismatch indicators (Green/Red)
- **Appeal System**: Submit appeals with document attachments for discrepancies
- **PDF Reports**: Download official verification reports with company letterhead
- **Email Notifications**: Automatic email updates for appeal responses
- **OTP-Based Login**: Secure two-factor authentication with email OTP verification

### For HR/Admin
- **Admin Dashboard**: Comprehensive dashboard with statistics and trends
- **Appeal Management**: Review and respond to appeals with HR comments
- **Employee Management**: Manage employee database and verification records
- **Email Integration**: Automated email notifications for all major actions
- **PDF Generation**: System-generated official reports
- **Audit Trail**: Complete tracking of all verification activities
- **Email Statistics**: Monitor email delivery and performance metrics
- **Excel Export**: Export verification data for analysis

## 🏗️ Architecture

### Backend Technologies
- **Framework**: Next.js 16.0.7 with App Router
- **Database**: MongoDB with Mongoose ODM (v7.0.0)
- **Authentication**: JWT-based secure authentication with OTP support
- **File Storage**: Vercel Blob or AWS S3 for document uploads
- **Email Services**: Multiple providers (SendGrid/Brevo/Resend) with fallback support
- **PDF Generation**: jsPDF with official letterhead
- **Validation**: Joi for API validation
- **Security**: Helmet, CORS, Express Rate Limiting, bcrypt password hashing

### Frontend Technologies
- **Framework**: Next.js 16.0.7 with React 19.0.0
- **Styling**: Tailwind CSS 4 with DaisyUI 5.0.43
- **UI Components**: Custom components with Framer Motion animations
- **Icons**: Lucide React
- **Charts**: Recharts for dashboard analytics
- **State Management**: React hooks and context

## 📋 Database Schema

### Employee Model
```javascript
{
  employeeId: String,     // Unique employee ID
  name: String,           // Employee full name
  email: String,          // Employee email
  entityName: String,     // TVSCSHIB/HIB
  dateOfJoining: Date,    // Date of joining
  dateOfLeaving: Date,    // Date of leaving
  designation: String,    // Executive/Assistant Manager/Manager
  exitReason: String,     // Resigned/Terminated/Retired/etc
  fnfStatus: String,      // Completed/Pending
  department: String      // Department name
}
```

### VerificationRecord Model
```javascript
{
  verificationId: String, // Unique verification ID
  employeeId: String,     // Employee reference
  verifierId: ObjectId,   // Verifier reference
  submittedData: Object,  // Data provided by verifier
  comparisonResults: Array, // Detailed comparison results
  overallStatus: String,  // matched/partial_match/mismatch
  matchScore: Number,     // Percentage match score
  pdfReportUrl: String,   // Storage URL to PDF report
  consentGiven: Boolean   // Consent confirmation
  createdAt: Date,        // Timestamp
  updatedAt: Date         // Last update timestamp
}
```

### Appeal Model
```javascript
{
  appealId: String,       // Unique appeal ID
  verificationId: String, // Related verification ID
  appellantEmail: String, // Verifier email
  appellantName: String, // Verifier name
  appellantCompany: String, // Verifier company
  reason: String,          // Appeal reason
  documents: Array,       // Document URLs
  status: String,         // pending/approved/rejected
  hrComments: String,     // HR admin response
  reviewedBy: String,     // Admin reviewer
  reviewedAt: Date,       // Review timestamp
  createdAt: Date,        // Creation timestamp
}
```

### Admin Model
```javascript
{
  username: String,       // Unique username
  email: String,          // Email address
  password: String,       // Hashed password
  fullName: String,       // Full name
  role: String,           // super_admin/hr_manager
  department: String,     // Department
  permissions: Array,     // Permission list
  createdAt: Date,        // Account creation
  isActive: Boolean,      // Account status
  lastLogin: Date         // Last login timestamp
}
```

### Verifier Model
```javascript
{
  email: String,          // Unique email
  password: String,       // Hashed password
  companyName: String,    // Company name
  contactPerson: String,  // Contact person name
  phone: String,          // Phone number
  emailVerified: Boolean, // Email verification status
  verificationCount: Number, // Total verifications
  isActive: Boolean,      // Account status
  createdAt: Date,        // Account creation
  lastLoginAt: Date       // Last login
}
```

### EmailLog Model
```javascript
{
  to: String,             // Recipient email
  subject: String,        // Email subject
  provider: String,       // Email provider used
  status: String,         // sent/failed/pending
  template: String,       // Template used
  metadata: Object,       // Additional metadata
  sentAt: Date,           // Sent timestamp
  error: String           // Error message if failed
}
```

## 🔧 Setup Instructions

### Prerequisites
- **Node.js**: 18+ (strictly <21 as per engines configuration)
- **npm**: Package manager for dependencies
- **MongoDB**: MongoDB Atlas cluster (free tier recommended)
- **Email Provider**: SendGrid, Brevo, or Resend account
- **File Storage**: Vercel Blob for production, or AWS S3 bucket
- **Deployment**: Netlify account for hosting

### 1. Clone and Install
```bash
git clone <repository-url>
cd Ex-Employee-Verification-Portal
npm install
```

### 2. Environment Configuration
Copy the example environment file and configure with your credentials:

```bash
cp .env.example .env.local
```

Update `.env.local` with your actual values:

```env
# ============================================
# REQUIRED - Database
# ============================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/employee-verification

# ============================================
# REQUIRED - Authentication
# ============================================
JWT_SECRET=your-super-secure-jwt-secret-key-at-least-32-chars
JWT_EXPIRES_IN=7d

# ============================================
# REQUIRED - Email Service (choose one or multiple)
# ============================================
# Email provider: sendgrid, resend, brevo, ab_test, fallback
EMAIL_PROVIDER=sendgrid

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Resend (alternative)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Brevo (alternative)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxx

# Email sender configuration
FROM_EMAIL=noreply@yourdomain.com
SUPPORT_EMAIL=hr@yourdomain.com
COMPANY_NAME=Your Company Name

# SMTP fallback (if needed)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password

# ============================================
# REQUIRED - File Storage (Vercel Blob for production)
# ============================================
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxxxxxxxxx

# AWS S3 Alternative (optional)
# AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
# AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# AWS_S3_BUCKET=employee-verification-docs
# AWS_REGION=us-east-1

# ============================================
# OPTIONAL - Application Config
# ============================================
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### 3. Database Seeding
Initialize your database with sample data:

```bash
# For MongoDB-based seeding
node scripts/seed-mongodb.js

# OR create admin user for localStorage-based setup
node create-admin.js
```

This will create:
- 6 sample employee records including the test case "S Sathish"
- 2 admin accounts (super admin and HR manager)

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### 5. Test Verification System
Follow the testing guide in [QUICK_START.md](./QUICK_START.md) for comprehensive testing instructions.

## 👤 Default Login Credentials

### Admin Accounts
- **Super Admin**: username: `admin`, password: `admin123`
- **HR Manager**: username: `hr_manager`, password: `hr123`

### Test Employee
Use Employee ID: `EMP006` (S Sathish) for testing verification requests.

### Test Verifier Account
- **Email**: test@company.com
- **Password**: Test@12345

## 🌐 Deployment

### Netlify Deployment

#### 1. Configure Netlify Build
The `netlify.toml` file is already configured with:
- Build command: `npm run build`
- Publish directory: `.next`
- API routing to Netlify Functions
- Security headers
- CORS configuration
- Redirect rules for client-side routing

#### 2. Environment Variables in Netlify
Set environment variables in Netlify dashboard:
- Navigate to Site settings → Build & deploy → Environment
- Add all variables from `.env.local` (DO NOT commit actual secrets)

#### 3. Deploy
```bash
# Build the application
npm run build

# Deploy to Netlify (if using CLI)
netlify deploy --prod --dir=.next
```

### Vercel Deployment
The project includes [`vercel.json`](./vercel.json) for Vercel deployment.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Verifier registration with company email validation
- `POST /api/auth/login` - Verifier login with JWT generation
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP token
- `GET /api/auth/me` - Get current user profile
- `POST /api/admin/login` - Admin login

### Verification
- `POST /api/verify/request` - Submit verification request
- `POST /api/verify/validate-employee` - Validate employee ID before verification
- `GET /api/verify/request` - Get verification history

### Appeals
- `POST /api/appeals` - Submit appeal with file upload
- `GET /api/appeals` - List appeals (admin only)
- `POST /api/admin/appeals/[id]/respond` - Respond to appeal

### Reports
- `POST /api/reports/generate` - Generate PDF report
- `GET /api/reports/generate` - Get existing PDF

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/email-stats` - Email delivery statistics
- `GET /api/admin/export` - Export data to Excel

## 🔄 Verification Workflow

1. **Verifier Registration**: Create account with company email (blocks personal emails)
2. **Email Verification**: Verify email via OTP sent to registered email
3. **Login**: Secure login with JWT tokens
4. **Consent Confirmation**: Verify consent from candidate
5. **Data Submission**: Enter employee details from relieving letter
6. **Instant Comparison**: Real-time match/mismatch visualization with color coding
7. **Report Generation**: Download official PDF with company letterhead
8. **Appeal Process**: Submit appeals with documents for discrepancies
9. **HR Review**: Admin reviews and responds to appeals
10. **Email Notifications**: Automated updates throughout process via multiple providers

## 📧 Email Services

The system supports multiple email providers with automatic fallback:

### Primary Providers
- **SendGrid**: Primary transactional email provider
- **Brevo**: Alternative with SMTP support
- **Resend**: Modern API for transactional emails

### Features
- **Automatic Fallback**: If primary provider fails, automatically tries backup
- **A/B Testing**: Test different providers for performance
- **Email Logging**: Track all sent emails in database
- **Templates**: Professional HTML email templates
- **Attachments**: Support for PDF attachments

### Email Types Sent
- Welcome/Registration confirmation
- OTP for login verification
- Verification reports with PDF
- Appeal status updates
- Admin notifications

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **JWT Expiry Management**: Tokens expire after 7 days by default
- **Company Email Validation**: Blocks personal email domains (Gmail, Yahoo, etc.)
- **Password Hashing**: bcrypt with 12 salt rounds for secure storage
- **API Rate Limiting**: Prevent abuse with express-rate-limit
- **Input Validation**: Comprehensive validation with Joi schemas
- **File Upload Security**: Type and size validation

- **CORS Protection**: Configurable Cross-Origin Resource Sharing policies
- **Helmet**: Security headers for Express.js
- **Environment Variables**: Sensitive configuration via environment files
- **SQL Injection Prevention**: No-SQL injection protection via Mongoose sanitization
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Token-based CSRF protection (can be enabled)

## 📁 Project Structure

```
Ex-Employee-Verification-Portal/
├── app/                          # Next.js App Router (pages and layouts)
│   ├── admin/                    # Admin dashboard pages
│   │   ├── appeals/             # Appeal management interface
│   │   ├── dashboard/           # Admin dashboard with stats
│   │   └── login/               # Admin login page
│   ├── api/                     # API routes
│   │   ├── admin/               # Admin-specific endpoints
│   │   ├── appeals/             # Appeal handling endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── reports/             # PDF generation endpoints
│   │   └── verify/              # Verification endpoints
│   ├── login/                   # Verifier login page
│   └── verify/                  # Verification workflow pages
├── components/                   # Reusable React components
│   ├── admin/                   # Admin UI components
│   ├── auth/                    # Authentication components
│   ├── layout/                  # Layout components (Header, Footer)
│   ├── ui/                      # Generic UI components (Toast, etc.)
│   └── verify/                  # Verification wizard components
├── lib/                         # Utility libraries and services
│   ├── db/                      # Database connection
│   ├── models/                  # Mongoose models
│   ├── services/                # Business logic services
│   └── *.service.js             # Various service modules
├── public/                      # Static assets
│   ├── uploads/                 # File storage for uploads
│   └── data.json                # Seed data
├── scripts/                     # Database scripts and utilities
├── .env.example                 # Example environment variables
├── .gitignore                   # Git ignore rules
├── jsconfig.json                # JavaScript configuration
├── next.config.mjs              # Next.js configuration
├── netlify.toml                 # Netlify deployment config
├── vercel.json                  # Vercel deployment config
├── package.json                 # Project dependencies
├── tailwind.config.js           # Tailwind CSS configuration
└── README.md                    # This file
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test path/to/test.spec.js
```

### Test Coverage

- Authentication flow (registration, login, OTP verification)
- Verification request submission
- Employee data validation and comparison
- Appeal submission and review
- PDF report generation
- Email service functionality
- Admin dashboard operations
- API endpoint functionality
- Error handling and edge cases

### Test Data

The project includes test scripts for creating test credentials:

```bash
# Create test verifier account
node scripts/create-test-credentials.js

# Seed database with test data
node scripts/seed-mongodb.js

# Verify test login works
node scripts/diagnose-login.js

# Check existing verifiers
node scripts/check-verifiers.js
```

See [TEST_CREDENTIALS_GUIDE.md](./TEST_CREDENTIALS_GUIDE.md) and [TEST_LOGIN_INSTRUCTIONS.md](./TEST_LOGIN_INSTRUCTIONS.md) for detailed testing instructions.

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
**Problem**: Unable to connect to MongoDB
**Solution**:
- Verify MongoDB URI in `.env.local`
- Check IP whitelist in MongoDB Atlas
- Ensure network access is allowed
- Check MongoDB credentials

```bash
# Test MongoDB connection
node lib/db/mongodb.js
```

#### 2. Email Not Sending
**Problem**: Emails not received by users
**Solution**:
- Verify API key for chosen email provider
- Check provider-specific configurations
- Review email logs in database
- Ensure FROM_EMAIL is verified
- Check spam folder

#### 3. File Upload Fails
**Problem**: Unable to upload documents
**Solution**:
- Verify storage provider credentials
- Check file size restrictions
- Ensure file types are allowed
- Review storage bucket permissions

#### 4. Build Errors
**Problem**: `npm run build` fails
**Solution**:
- Ensure Node.js version < 21 (check `engines` in package.json)
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check all environment variables are set

#### 5. Login Authentication Issues
**Problem**: Verifier unable to log in
**Solution**:
- Check email is verified (use diagnostics script)
- Verify account is not blocked
- Check password with `node scripts/diagnose-login.js email@test.com`
- Ensure JWT_SECRET is set correctly

```bash
# Diagnose login issues
node scripts/diagnose-login.js <email> <password>

# Unblock a verifier if locked out
node scripts/unblock-verifier.js <email>
```

## 📚 Additional Documentation

- [QUICK_START.md](./QUICK_START.md) - Quick start guide for beginners
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [DEPLOY_TO_NETLIFY.md](./DEPLOY_TO_NETLIFY.md) - Netlify-specific deployment guide
- [TEST_CREDENTIALS_GUIDE.md](./TEST_CREDENTIALS_GUIDE.md) - Test credentials and scenarios
- [TEST_LOGIN_INSTRUCTIONS.md](./TEST_LOGIN_INSTRUCTIONS.md) - Testing login functionality
- [VERIFIER_LOGIN_FIX.md](./VERIFIER_LOGIN_FIX.md) - Common verifier login issues and fixes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for your changes
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use 2 spaces for indentation
- Follow existing code conventions
- Write descriptive comments
- Add JSDoc comments for functions
- Test your changes thoroughly

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, email support@yourcompany.com or open an issue in the repository.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [MongoDB](https://www.mongodb.com/)
- Email services supported by [SendGrid](https://sendgrid.com/), [Brevo](https://www.brevo.com/), and [Resend](https://resend.com/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/) and [DaisyUI](https://daisyui.com/)
- Icons from [Lucide React](https://lucide.dev/)

---

**Version**: 1.0.0  
**Last Updated**: December 2024
