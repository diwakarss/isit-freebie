output "amplify_app_id" {
  description = "Amplify app ID"
  value       = aws_amplify_app.app.id
}

output "amplify_url" {
  description = "Default Amplify URL"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.app.id}.amplifyapp.com"
}

output "custom_domain" {
  description = "Custom domain URL"
  value       = "https://${var.domain_name}"
}

output "iam_role_arn" {
  description = "IAM role ARN used by Amplify for Bedrock access"
  value       = aws_iam_role.amplify_bedrock.arn
}

output "dns_note" {
  description = "Important DNS note"
  value       = "Cloudflare proxy (orange cloud) must be OFF for isitafreebie CNAME — Amplify needs DNS-only for SSL verification"
}
