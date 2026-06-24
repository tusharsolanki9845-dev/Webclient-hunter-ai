const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../utils/validators');
const { supabase } = require('../services/supabase.service');

const router = express.Router();

// These endpoints proxy Supabase auth so the frontend can use a single backend URL.
// In most setups you'll call Supabase directly from the frontend instead.

/**
 * POST /api/auth/signup
 */
router.post('/signup', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate,
], async (req, res, next) => {
  try {
    if (!supabase) return res.json({ message: 'Demo mode — Supabase not configured', demo: true });

    const { email, password } = req.body;
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'Account created successfully', userId: data.user.id });
  } catch (err) { next(err); }
});

/**
 * POST /api/auth/login
 */
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate,
], async (req, res, next) => {
  try {
    if (!supabase) return res.json({ message: 'Demo mode', token: 'demo-token', demo: true });

    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ token: data.session.access_token, user: data.user });
  } catch (err) { next(err); }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res, next) => {
  try {
    if (!supabase) return res.json({ message: 'Logged out (demo)' });
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await supabase.auth.admin.signOut(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
