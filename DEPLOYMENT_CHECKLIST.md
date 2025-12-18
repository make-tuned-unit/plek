# ✅ Staging Deployment Quick Checklist

Use this alongside the detailed guide. Check off each step as you complete it.

## Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] All environment variables written down
- [ ] Domain DNS access ready

## Backend (Railway)
- [ ] Railway account created
- [ ] Project created from GitHub repo
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] Railway URL copied (e.g., `your-app.railway.app`)

## Frontend (Vercel)
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory set to `frontend`
- [ ] `NEXT_PUBLIC_API_URL` set to Railway URL + `/api`
- [ ] Other environment variables added
- [ ] Deployment successful
- [ ] Custom domain `staging.parkplekk.com` added

## DNS Configuration
- [ ] CNAME record added: `staging` → `cname.vercel-dns.com`
- [ ] DNS propagated (check in Vercel dashboard)

## Final Configuration
- [ ] Backend `FRONTEND_URL` updated to `https://staging.parkplekk.com`
- [ ] Stripe webhook URL updated to Railway backend
- [ ] All services redeployed

## Testing
- [ ] Frontend loads at `https://staging.parkplekk.com`
- [ ] Can register new user
- [ ] Email confirmation received
- [ ] Can log in
- [ ] Can create booking
- [ ] Payment flow works (test mode)
- [ ] Emails display correctly with logo

## Share
- [ ] Send `https://staging.parkplekk.com` to cofounder
- [ ] Document any issues found

---

**Time Estimate:** 45-60 minutes total



