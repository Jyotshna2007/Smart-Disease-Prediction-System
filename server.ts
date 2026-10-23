import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { requireAuth, generateToken, sanitizeUser, AuthenticatedRequest } from './server/auth.js';
import { evaluateClinicalFeatures, HealthInputs } from './server/predictionEngine.js';
import { extractHealthDataFromPdf } from './server/pdfExtractor.js';
import { generateReportHtml } from './server/reportGenerator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Multer upload configuration for PDF files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_PDF_TYPE'));
    }
  },
});

// ================= AUTH ROUTES =================

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, confirm_password, preferred_language = 'en' } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match. Please verify your password.' });
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const validLang = ['en', 'te', 'hi'].includes(preferred_language) ? preferred_language : 'en';
    const password_hash = hashPassword(password);

    const newUser = db.createUser({
      name: name.trim(),
      email: email.trim(),
      password_hash,
      preferred_language: validLang,
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Something went wrong while processing your request. Please try again.' });
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "We couldn't find an account with these details. Create an account to continue." });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Logged in successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Something went wrong while processing your request. Please try again.' });
  }
});

// Logout
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user profile
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: sanitizeUser(req.user!) });
});

// Update profile / language / password
app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, preferred_language, current_password, new_password } = req.body;

    const updates: Partial<{ name: string; preferred_language: 'en' | 'te' | 'hi'; password_hash: string }> = {};

    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updates.name = name.trim();
    }

    if (preferred_language && ['en', 'te', 'hi'].includes(preferred_language)) {
      updates.preferred_language = preferred_language;
    }

    if (new_password) {
      if (!current_password || !verifyPassword(current_password, user.password_hash)) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
      if (typeof new_password !== 'string' || new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }
      updates.password_hash = hashPassword(new_password);
    }

    const updated = db.updateUser(user.id, updates);
    return res.json({
      message: 'Profile updated successfully',
      user: updated ? sanitizeUser(updated) : sanitizeUser(user),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ================= PREDICTION & CLINICAL ROUTES =================

// Manual Clinical Assessment
app.post('/api/predict/manual', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const inputs: HealthInputs = req.body;
    const result = evaluateClinicalFeatures(inputs);

    if (!result.sufficient_data) {
      return res.status(400).json({
        error: result.errorMessage || "We couldn't find enough information to complete this assessment. Please provide the required medical details.",
      });
    }

    // Save prediction record associated with authenticated user
    const record = db.savePrediction({
      user_id: req.user!.id,
      input_type: 'manual',
      condition_id: result.condition_id,
      predicted_condition: result.predicted_condition,
      predicted_condition_te: result.predicted_condition_te,
      predicted_condition_hi: result.predicted_condition_hi,
      confidence: result.confidence,
      risk_level: result.risk_level,
      signals: result.signals,
      summary: result.summary,
      summary_te: result.summary_te,
      summary_hi: result.summary_hi,
      recommendations: result.recommendations,
      recommendations_te: result.recommendations_te,
      recommendations_hi: result.recommendations_hi,
      raw_input: inputs,
      method: result.method,
      model_info: result.model_info,
      secondary_predictions: result.secondary_predictions,
    });

    return res.json({ record });
  } catch (error) {
    console.error('Manual prediction error:', error);
    return res.status(500).json({ error: 'Something went wrong while processing your request. Please try again.' });
  }
});

// PDF Medical Report Upload & Processing
app.post('/api/predict/upload', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  upload.single('report')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_PDF_TYPE' || (err as any).code === 'LIMIT_FILE_TYPES') {
        return res.status(400).json({ error: 'Please upload a valid PDF medical report.' });
      }
      if ((err as any).code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The uploaded file exceeds the 15MB size limit.' });
      }
      return res.status(400).json({ error: 'File upload failed. Please try again.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a medical report PDF file to upload.' });
    }

    try {
      // Extract data from PDF (supports Telugu, Hindi, English, scanned reports)
      const { inputs } = await extractHealthDataFromPdf(req.file.buffer);

      // Run multi-disease prediction engine
      const result = evaluateClinicalFeatures(inputs);

      if (!result.sufficient_data) {
        return res.status(400).json({
          error: "We couldn't find enough information to complete this assessment. Please provide the required medical details.",
          extracted: inputs,
        });
      }

      // Save prediction record
      const record = db.savePrediction({
        user_id: req.user!.id,
        input_type: 'pdf',
        file_name: req.file.originalname,
        condition_id: result.condition_id,
        predicted_condition: result.predicted_condition,
        predicted_condition_te: result.predicted_condition_te,
        predicted_condition_hi: result.predicted_condition_hi,
        confidence: result.confidence,
        risk_level: result.risk_level,
        signals: result.signals,
        summary: result.summary,
        summary_te: result.summary_te,
        summary_hi: result.summary_hi,
        recommendations: result.recommendations,
        recommendations_te: result.recommendations_te,
        recommendations_hi: result.recommendations_hi,
        raw_input: inputs,
        method: result.method,
        model_info: result.model_info,
        secondary_predictions: result.secondary_predictions,
      });

      return res.json({ record, extracted: inputs });
    } catch (processError) {
      console.error('PDF processing error:', processError);
      return res.status(500).json({ error: 'Something went wrong while processing your medical report. Please try again.' });
    }
  });
});

// Get user prediction history
app.get('/api/predictions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const predictions = db.getPredictionsByUserId(req.user!.id);
  return res.json({ predictions });
});

// Get single prediction by ID
app.get('/api/predictions/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const record = db.getPredictionById(req.params.id, req.user!.id);
  if (!record) {
    return res.status(404).json({ error: 'Assessment report not found.' });
  }
  return res.json({ record });
});

// Delete prediction
app.delete('/api/predictions/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.deletePrediction(req.params.id, req.user!.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Assessment report not found or already deleted.' });
  }
  return res.json({ success: true });
});

// Download / View Report HTML in requested language
app.get('/api/reports/:id/download', (req: Request, res: Response) => {
  try {
    const token = req.query.token as string || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    if (!token) {
      return res.status(401).send('Authentication required to access report.');
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'smart-disease-prediction-jwt-secret-2025-secure';
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).send('Invalid user credentials.');
    }

    const record = db.getPredictionById(req.params.id, user.id);
    if (!record) {
      return res.status(404).send('Report not found or unauthorized.');
    }

    const reqLang = (req.query.lang as 'en' | 'te' | 'hi') || user.preferred_language || 'en';
    const lang = ['en', 'te', 'hi'].includes(reqLang) ? reqLang : 'en';

    let html = generateReportHtml(record, user, lang);
    if (req.query.print === '1') {
      // Open the browser's print dialog automatically ("Save as PDF")
      html = html.replace('</body>', '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},400);});</script></body>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.query.download === '1') {
      const stamp = new Date(record.created_at).toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="health-report-${record.id.slice(0, 8)}-${stamp}-${lang}.html"`);
    }
    return res.send(html);
  } catch (err) {
    return res.status(401).send('Invalid or expired token.');
  }
});

// ================= VITE DEV / PRODUCTION STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        // Never reload the browser when the API writes to the JSON "database"
        watch: { ignored: ['**/data/**', '**/ml/**', '**/sample_reports/**', '**/*.json'] },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
