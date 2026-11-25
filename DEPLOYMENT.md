# Auri deployment

## Public demo

The repository contains a static, dependency-free demo at `demo/index.html`. It mirrors the Auri reliability dashboard and runs deterministic benchmark logic entirely in the browser.

## GitHub Pages

A production Vite build workflow exists at `.github/workflows/pages.yml`. The build succeeds, but GitHub Pages must be enabled in the repository settings before the deployment action can publish.

After enabling **Settings → Pages → Source: GitHub Actions**, re-run **Deploy Auri Live Demo**.

Expected Pages URL:

`https://saisrilaxmir.github.io/Auri/`

## Full backend

The production backend path is FastAPI + AWS:

S3 → DynamoDB/SQS → Lambda → AWS Batch/Fargate → Transcribe/Bedrock → S3/DynamoDB/CloudWatch.

The infrastructure definitions are under `infra/`. Deploying this path requires an authenticated AWS account and provisioned VPC resources.
