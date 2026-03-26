terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project = "isitafreebie"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- IAM Role (manually created, not Terraform-managed) ---
# arn:aws:iam::725822497948:role/AmplifyConsoleSvcRole
# Permissions: AdministratorAccess-Amplify + inline Bedrock InvokeModel

# --- Amplify App ---

resource "aws_amplify_app" "app" {
  name       = var.app_name
  repository = var.github_repository

  access_token         = var.github_token
  iam_service_role_arn = var.amplify_service_role_arn

  platform = "WEB_COMPUTE"

  build_spec = <<-YAML
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
          - .next/cache/**/*
          - node_modules/**/*
  YAML

  environment_variables = {
    BEDROCK_REGION                   = var.aws_region
    BEDROCK_MODEL                    = var.bedrock_model
    SHARE_SECRET                     = var.share_secret
    BEDROCK_ACCESS_KEY_ID            = var.bedrock_access_key_id
    BEDROCK_SECRET_ACCESS_KEY        = var.bedrock_secret_access_key
    NEXT_PUBLIC_TURNSTILE_SITE_KEY   = var.turnstile_site_key
    NEXT_PUBLIC_ANALYZE_URL          = aws_lambda_function_url.analyze.function_url
    TURNSTILE_SECRET                 = var.turnstile_secret
  }

  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
  }
}

# --- Branch ---

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.app.id
  branch_name = var.github_branch

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  enable_auto_build = true

  # Env vars inherited from app level — branch-level overrides only if needed
  environment_variables = {}

  lifecycle {
    ignore_changes = [environment_variables]
  }
}

# --- Amplify Custom Domain ---

resource "aws_amplify_domain_association" "domain" {
  app_id      = aws_amplify_app.app.id
  domain_name = var.parent_domain

  sub_domain {
    branch_name = aws_amplify_branch.main.branch_name
    prefix      = "isitafreebie"
  }

  wait_for_verification = false
}

# --- Cloudflare DNS ---

# CNAME pointing to Amplify
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "isitafreebie"
  content = "${aws_amplify_branch.main.branch_name}.${aws_amplify_app.app.id}.amplifyapp.com"
  type    = "CNAME"
  ttl     = 1
  proxied = false # Must be DNS-only for Amplify SSL verification
  comment = "Is it a Freebie? - Amplify hosting"
}

# Amplify domain verification CNAME (required for SSL cert)
resource "cloudflare_record" "amplify_verify" {
  zone_id = var.cloudflare_zone_id
  name    = "_c3e09a3edc84d978bf0bdd2f98e7a81e.isitafreebie"
  content = "_c3e09a3edc84d978bf0bdd2f98e7a81e.acm-validations.aws"
  type    = "CNAME"
  ttl     = 1
  proxied = false
  comment = "Amplify SSL certificate validation"

  lifecycle {
    # The actual verification record name comes from Amplify after domain association
    # You may need to update this after first apply — check Amplify console for exact values
    ignore_changes = [name, content]
  }
}

# --- Lambda for Analyze API (bypasses Amplify 30s timeout) ---

resource "aws_iam_role" "lambda_analyze" {
  name = "${var.app_name}-analyze-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_analyze.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "bedrock-invoke"
  role = aws_iam_role.lambda_analyze.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock:InvokeModel"]
      Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_model}"
    }]
  })
}

# Build Lambda zip
resource "null_resource" "lambda_build" {
  triggers = {
    source_hash = filemd5("${path.module}/../lambda/index.mjs")
    pkg_hash    = filemd5("${path.module}/../lambda/package.json")
  }

  provisioner "local-exec" {
    working_dir = "${path.module}/../lambda"
    command     = "npm ci --production && zip -r ${path.module}/lambda.zip index.mjs node_modules"
  }
}

data "local_file" "lambda_zip" {
  filename   = "${path.module}/lambda.zip"
  depends_on = [null_resource.lambda_build]
}

resource "aws_lambda_function" "analyze" {
  filename         = "${path.module}/lambda.zip"
  source_code_hash = data.local_file.lambda_zip.content_base64sha256
  function_name    = "${var.app_name}-analyze"
  role             = aws_iam_role.lambda_analyze.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 120
  memory_size      = 256

  # Hard cap: max 5 concurrent Bedrock calls (prevents runaway spend)
  reserved_concurrent_executions = 5

  environment {
    variables = {
      BEDROCK_MODEL    = var.bedrock_model
      BEDROCK_REGION   = var.aws_region
      SHARE_SECRET     = var.share_secret
      TURNSTILE_SECRET = var.turnstile_secret
      # Lambda uses its execution role for Bedrock access — no explicit keys needed
    }
  }

  depends_on = [null_resource.lambda_build]
}

resource "aws_lambda_function_url" "analyze" {
  function_name      = aws_lambda_function.analyze.function_name
  authorization_type = "NONE"

  # CORS handled by Lambda code — do NOT add cors block here
  # (duplicates headers and causes browser rejection)
}

# --- Budget ---

resource "aws_budgets_budget" "monthly" {
  name         = "${var.app_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:project$isitafreebie"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}

# Bedrock usage budget — Bedrock costs are per-model usage, not tagged resources
resource "aws_budgets_budget" "bedrock" {
  name         = "${var.app_name}-bedrock-budget"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Bedrock"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
