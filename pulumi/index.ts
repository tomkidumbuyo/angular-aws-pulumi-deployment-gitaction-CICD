import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as synced_folder from "@pulumi/synced-folder";

// Import the program's configuration settings.
const config = new pulumi.Config();
const path = config.get("path") || "./www";
const indexDocument = config.get("indexDocument") || "index.html";
const errorDocument = config.get("errorDocument") || "error.html";
const hostedZoneId = 'Z002829096SD9TCQ7F07'
const domainName = config.require("domainName")

// Create an S3 bucket and configure it as a website.
const bucket = new aws.s3.Bucket(`${domainName}-bucket`, {
    website: {
        indexDocument: indexDocument,
        errorDocument: errorDocument,
    },
});

// Configure ownership controls for the new S3 bucket
const ownershipControls = new aws.s3.BucketOwnershipControls(`${domainName}-ownership-controls`, {
    bucket: bucket.bucket,
    rule: {
        objectOwnership: "ObjectWriter",
    },
});

// Configure public ACL block on the new S3 bucket
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(`${domainName}-public-access-block`, {
    bucket: bucket.bucket,
    blockPublicAcls: false,
});

// Use a synced folder to manage the files of the website.
const bucketFolder = new synced_folder.S3BucketFolder(`${domainName}-bucket-folder`, {
    path: path,
    bucketName: bucket.bucket,
    acl: "public-read",
}, { dependsOn: [ownershipControls, publicAccessBlock]});

// ACM SSL Cert for CloudFront Distrbution
const appCert = new aws.acm.Certificate(`${domainName}-certificate`, {
  domainName: `${domainName}`,
  validationMethod: "DNS",
});

const exampleZone = aws.route53.getZone({
  name: `${domainName}`,
  privateZone: false,
})

// Create a validation record
const certRecord = new aws.route53.Record(`${domainName}-route53-certificate-validation-record`, {
  zoneId: exampleZone.then(x => x.zoneId),
  name: appCert.domainValidationOptions[0].resourceRecordName,
  records: [appCert.domainValidationOptions[0].resourceRecordValue],
  ttl: 60,
  type: appCert.domainValidationOptions[0].resourceRecordType,
});

// Validate the certificate
const certificateValidation = new aws.acm.CertificateValidation(`${domainName}-certificate-validation`, {
  certificateArn: appCert.arn,
  validationRecordFqdns: [certRecord.fqdn],
});

// Create a CloudFront CDN to distribute and cache the website.
const cdn = new aws.cloudfront.Distribution(`${domainName}-cdn`, {
    enabled: true,
    aliases: [`${domainName}`,],
    origins: [{
        originId: bucket.arn,
        domainName: bucket.websiteEndpoint,
        customOriginConfig: {
            originProtocolPolicy: "http-only",
            httpPort: 80,
            httpsPort: 443,
            originSslProtocols: ["TLSv1.2"],
        },
    }],
    defaultCacheBehavior: {
        targetOriginId: bucket.arn,
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
        ],
        cachedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
        ],
        defaultTtl: 3600,
        maxTtl: 86400,
        minTtl: 0,
        forwardedValues: {
            queryString: true,
            cookies: {
                forward: "all",
            },
        },
    },
    orderedCacheBehaviors: [
      {
        pathPattern: "/*",
        allowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
        ],
        cachedMethods: [
          "GET",
          "HEAD",
        ],
        targetOriginId: bucket.arn,
        forwardedValues: {
          queryString: false,
          cookies: {
            forward: "none",
          },
        },
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
        compress: true,
        viewerProtocolPolicy: "redirect-to-https",
      },
    ],
    priceClass: "PriceClass_100",
    customErrorResponses: [{
        errorCode: 404,
        responseCode: 404,
        responsePagePath: `/${errorDocument}`,
    }],
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
    tags: {
      Environment: pulumi.getStack(),
    },
    viewerCertificate: {
      acmCertificateArn: appCert.arn,
      cloudfrontDefaultCertificate: false,
      minimumProtocolVersion: 'TLSv1.2_2021',
      sslSupportMethod: 'sni-only'
    },
});

//Connect CloadFront CDN to Route53
const route53Record = new aws.route53.Record(`${domainName}-route53-cdn-domain-name-record`, {
      name: domainName,
      zoneId: hostedZoneId,
      type: "A",
      aliases: [{
        name: cdn.domainName,
        zoneId: cdn.hostedZoneId,
        evaluateTargetHealth: true,
    }],
});

// Export the URLs and hostnames of the bucket and distribution.
export const originURL = pulumi.interpolate`http://${bucket.websiteEndpoint}`;
export const originHostname = bucket.websiteEndpoint;
export const cdnURL = pulumi.interpolate`https://${cdn.domainName}`;
export const cdnHostname = cdn.domainName;
