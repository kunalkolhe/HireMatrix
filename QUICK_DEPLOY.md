# Quick Vercel Deployment Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. Click **"Add New..."** → **"Project"**
3. **Import your GitHub repository**
4. Vercel will auto-detect Next.js ✅

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` = `your_supabase_url`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key`

**Optional (for AI features):**
- `OPENROUTER_API_KEY` = `your_openrouter_key`

**Optional (for resume parsing):**
- `APYHUB_API_KEY` = `your_apyhub_key`
- `APILAYER_API_KEY` = `your_apilayer_key`

### Step 4: Deploy

Click **"Deploy"** and wait 2-5 minutes! 🎉

Your app will be live at: `your-project.vercel.app`

---

## 📋 After Deployment

1. **Run Database Migrations** in Supabase:
   - Run `database-schema.sql`
   - Run `add-resume-columns-migration.sql`

2. **Set Up Storage Buckets** in Supabase:
   - Create `avatars` bucket (Public)
   - Create `resumes` bucket (Public)

3. **Test Your App**:
   - Sign up a new user
   - Create an assessment (as recruiter)
   - Take an assessment (as candidate)

---

## 🔍 Where to Find Your Keys

- **Supabase**: Dashboard → Settings → API
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys)
- **ApyHub**: [apyhub.io](https://apyhub.io)
- **APILayer**: [apilayer.com](https://apilayer.com)

---

## ✅ Build Status

Your project builds successfully! ✓

See `VERCEL_DEPLOYMENT.md` for detailed instructions.
