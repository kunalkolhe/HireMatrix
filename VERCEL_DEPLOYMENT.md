# Vercel Deployment Guide

This guide will help you deploy SkillZen to Vercel.

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier available)
3. **Supabase Project** - Your production Supabase database should be set up
4. **API Keys** - All required API keys should be ready

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js configuration

### 3. Configure Environment Variables

In the Vercel project settings, add the following environment variables:

#### Required Variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Optional but Recommended:

```
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_API_KEY_2=your_backup_openrouter_key (optional)
OPENROUTER_API_KEY_3=your_backup_openrouter_key (optional)
```

#### Resume Parsing (Optional):

```
APYHUB_API_KEY=your_apyhub_api_key
APILAYER_API_KEY=your_apilayer_api_key
```

#### Code Compilation (Optional):

```
RAPIDAPI_KEY=your_rapidapi_key
```

### 4. Configure Build Settings

Vercel will auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `next build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (or `pnpm install` / `yarn install`)

### 5. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 2-5 minutes)
3. Your app will be live at `your-project.vercel.app`

## Post-Deployment Checklist

### ✅ Database Setup

1. **Run Database Schema**:
   - Go to your Supabase SQL Editor
   - Run `database-schema.sql` if not already done
   - Run `add-resume-columns-migration.sql` for resume features

2. **Set Up Storage Buckets**:
   - Create `avatars` bucket (Public)
   - Create `resumes` bucket (Public or Private with policies)
   - Add appropriate RLS policies (see README.md)

### ✅ Verify Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all variables are set correctly
3. Make sure they're added to **Production**, **Preview**, and **Development** environments

### ✅ Test the Application

1. **Test Authentication**:
   - Sign up a new user
   - Sign in/out
   - Verify profile creation

2. **Test Recruiter Flow**:
   - Create a job/assessment
   - Generate questions
   - Publish assessment

3. **Test Candidate Flow**:
   - Take an assessment
   - Upload resume
   - View results

## Environment Variables Reference

### Required

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API → anon public key |

### Optional (for AI features)

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI | [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_API_KEY_2` | Backup OpenRouter key | [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_API_KEY_3` | Backup OpenRouter key | [openrouter.ai](https://openrouter.ai) |

### Optional (for resume parsing)

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `APYHUB_API_KEY` | ApyHub API key | [apyhub.io](https://apyhub.io) |
| `APILAYER_API_KEY` | APILayer API key | [apilayer.com](https://apilayer.com) |

### Optional (for code compilation)

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `RAPIDAPI_KEY` | RapidAPI key | [rapidapi.com](https://rapidapi.com) |

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate will be automatically provisioned

## Troubleshooting

### Build Fails

1. **Check Build Logs**: Vercel Dashboard → Deployments → Click on failed deployment
2. **Common Issues**:
   - Missing environment variables
   - TypeScript errors (currently ignored in config)
   - ESLint errors (currently ignored in config)

### Runtime Errors

1. **Check Function Logs**: Vercel Dashboard → Your Project → Functions
2. **Common Issues**:
   - Supabase connection issues (check URL and keys)
   - API key issues (check API keys are valid)
   - CORS issues (Supabase handles this automatically)

### Database Connection Issues

1. Verify Supabase URL and keys are correct
2. Check Supabase project is active
3. Verify RLS policies allow access
4. Check network connectivity from Vercel

## Performance Optimization

### Recommended Vercel Settings

1. **Edge Functions**: Consider using Edge Runtime for API routes if needed
2. **Image Optimization**: Already configured in `next.config.mjs`
3. **Caching**: Vercel automatically caches static assets

### Database Optimization

1. Ensure indexes are created (see `database-schema.sql`)
2. Monitor Supabase dashboard for query performance
3. Use connection pooling if needed

## Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Supabase Logs**: Monitor in Supabase Dashboard
3. **Error Tracking**: Consider adding Sentry or similar

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
- Detect the push
- Start a new build
- Deploy to preview
- Deploy to production (if on main branch)

## Rollback

If something goes wrong:

1. Go to Vercel Dashboard → Deployments
2. Find the previous working deployment
3. Click the three dots → "Promote to Production"

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
