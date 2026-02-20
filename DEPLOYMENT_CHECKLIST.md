# Pre-Deployment Checklist

Use this checklist before deploying to Vercel.

## ✅ Code Preparation

- [ ] All code is committed to Git
- [ ] Code is pushed to GitHub repository
- [ ] No sensitive data in code (API keys, passwords, etc.)
- [ ] `.env.local` is in `.gitignore` (should already be)

## ✅ Environment Variables

Prepare these values before deployment:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Dashboard
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Dashboard
- [ ] `OPENROUTER_API_KEY` - From OpenRouter (if using AI features)
- [ ] `APYHUB_API_KEY` - From ApyHub (if using resume parsing)
- [ ] `APILAYER_API_KEY` - From APILayer (if using resume parsing)
- [ ] `RAPIDAPI_KEY` - From RapidAPI (if using code compilation)

## ✅ Database Setup

- [ ] Supabase project is created and active
- [ ] Database schema is run (`database-schema.sql`)
- [ ] Resume migration is run (`add-resume-columns-migration.sql`)
- [ ] Storage buckets are created:
  - [ ] `avatars` bucket (Public)
  - [ ] `resumes` bucket (Public or Private with policies)
- [ ] RLS policies are enabled and tested
- [ ] Test user can be created successfully

## ✅ Testing

- [ ] Application builds locally: `npm run build`
- [ ] Application runs locally: `npm run dev`
- [ ] Authentication works (sign up, sign in, sign out)
- [ ] Recruiter flow works (create assessment, generate questions)
- [ ] Candidate flow works (take assessment, upload resume)
- [ ] No console errors in browser
- [ ] No build warnings (or acceptable warnings)

## ✅ Vercel Setup

- [ ] Vercel account is created
- [ ] GitHub repository is connected
- [ ] All environment variables are added in Vercel dashboard
- [ ] Build settings are verified (auto-detected by Vercel)

## ✅ Post-Deployment

After deployment:

- [ ] Application loads at Vercel URL
- [ ] Authentication works on production
- [ ] Database connection works
- [ ] API routes work (test question generation, evaluation)
- [ ] File uploads work (profile photos, resumes)
- [ ] No errors in Vercel function logs
- [ ] No errors in browser console

## Quick Commands

```bash
# Test build locally
npm run build

# Test production build locally
npm run build && npm start

# Check for TypeScript errors (if not ignoring)
npx tsc --noEmit

# Check for linting errors (if not ignoring)
npm run lint
```
