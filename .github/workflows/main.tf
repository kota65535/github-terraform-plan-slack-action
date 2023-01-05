terraform {
  backend "s3" {
    bucket         = "terraform-backend-561678142736"
    region         = "ap-northeast-1"
    key            = "github-action-test.tfstate"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.48.0"
    }
  }
  required_version = "~> 1.3.0"
}

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_dynamodb_table" "test" {
  name         = "github-action-test-${terraform.workspace}"
  hash_key     = "ID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "ID"
    type = "S"
  }
}
