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
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "aws_caller_identity" "current" {}

# --- IAM Role for Amplify to call Bedrock ---

resource "aws_iam_role" "amplify_bedrock" {
  name = "${var.app_name}-amplify-bedrock"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "amplify.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_invoke" {
  name = "${var.app_name}-bedrock-invoke"
  role = aws_iam_role.amplify_bedrock.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "bedrock:InvokeModel"
      Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_model}"
    }]
  })
}

# --- Amplify App ---

resource "aws_amplify_app" "app" {
  name       = var.app_name
  repository = var.github_repository

  access_token         = var.github_token
  iam_service_role_arn = aws_iam_role.amplify_bedrock.arn

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
    AWS_REGION                = var.aws_region
    BEDROCK_MODEL             = var.bedrock_model
    SHARE_SECRET              = var.share_secret
    AMPLIFY_MONOREPO_APP_ROOT = "."
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
