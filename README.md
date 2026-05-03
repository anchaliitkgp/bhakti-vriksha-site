# Bhakti Vriksha Radha Madan Mohan — Website

Next.js 14 site for the Sunday program. Static export ready; deploys to AWS Amplify Hosting.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Edit content

- **32-week schedule:** `data/schedule.ts`
- **Speaker roster:** same file, `speakers` export
- **Home page copy:** `app/page.tsx`
- **About / teacher bios:** `app/about/page.tsx`
- **Resource links:** `app/resources/page.tsx`
- **Contact / email / WhatsApp:** `app/contact/page.tsx`
- **Registration form:** `app/register/page.tsx` — replace the iframe `src` with your Google Form embed URL

## Deploy to AWS Amplify (summary)

1. Push this folder to a Git repo (GitHub, GitLab, or Bitbucket).
2. AWS Console → Amplify → "Host web app" → connect the repo.
3. Amplify auto-detects Next.js. Accept defaults.
4. Amplify builds and deploys. You get a `*.amplifyapp.com` URL.
5. To add a custom domain: Amplify → Domain management → Add domain.

### Amplify build settings (already auto-detected, for reference)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

## Next phase (full-stack additions)

Once the static site is live, we layer on:

- **Cognito** — family login
- **DynamoDB + AppSync** — member profiles, sadhana tracker, nomination workflow
- **S3 (private)** — session recordings
- **Lambda + API Gateway** — email notifications, weekly digests

All of these integrate natively with Amplify.
