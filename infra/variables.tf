variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "isitafreebie"
}

variable "domain_name" {
  description = "Custom domain for the app"
  type        = string
  default     = "isitafreebie.jdlabs.top"
}

variable "parent_domain" {
  description = "Parent domain"
  type        = string
  default     = "jdlabs.top"
}

variable "github_repository" {
  description = "GitHub repository URL (https)"
  type        = string
}

variable "github_branch" {
  description = "Branch to deploy"
  type        = string
  default     = "master"
}

variable "github_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
}

variable "share_secret" {
  description = "HMAC signing secret for share URLs"
  type        = string
  sensitive   = true
}

variable "bedrock_model" {
  description = "Bedrock model ID"
  type        = string
  default     = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with DNS edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for jdlabs.top"
  type        = string
}
