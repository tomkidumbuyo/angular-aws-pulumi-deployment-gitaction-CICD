# Angular deployment using Pulumi and GitActions

This repository is a basic angular project that is configured to be deployed an AWS S3 bucket with cloudfront CDN. The deployment will be handled automatically when we push to master. CICD is configured by Github Actions and Pulumi as IaC

### How to use this template
Please follow the following steps to deploy

## 1. Have an AWS account
First you need to have an AWS account.

## 2. Create an IAM user for your AWS account
Create an AWS IAMuser. Assign this user permision to create S3, Cloudfront, Certificates and edit route 53.

## 3. Create a route 53 hosted zone for your Domain Name
If you already have a domain name please add the domain name to Route53. do not worry about the SSL Certification. this project will handle it for you.

## 4. Create pulumi account
If you already have an account you will need an access token from the account. Currently this project is configured to create stack in local accounts, but you change this in the pulumi conifguration.

## 5. Add the following variables to your secrets lists on the repository
- `PULUMI_ACCESS_TOKEN`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

#### 6. Add the following variables to your Variables lists on the repository
- `DOMAIN_NAME`

