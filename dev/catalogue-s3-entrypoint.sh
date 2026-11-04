#!/bin/sh

set -e

S3_CONFIG=/etc/seaweedfs/s3.json

cat << JSON > "$S3_CONFIG"
{
  "identities": [
    {
      "name": "$BUCKET_NAME-user",
      "credentials": [
        {"accessKey": "$BUCKET_ACCESS_KEY", "secretKey": "$BUCKET_SECRET_KEY"}
      ],
      "actions": ["Read:$BUCKET_NAME", "Write:$BUCKET_NAME", "List:$BUCKET_NAME"]
    }
  ]
}
JSON
chmod 644 "$S3_CONFIG"

exec /entrypoint.sh mini \
  -dir=/data \
  -ip=127.0.0.1 \
  -ip.bind=127.0.0.1 \
  -master.telemetry=false \
  -s3.port=9000 \
  -s3.config="$S3_CONFIG" \
  -s3.port.iceberg=0 \
  -s3.port.lance=0 \
  -admin.port=9001 \
  -admin.port.legacy=0 \
  -admin.user="$S3_ROOT_USER" \
  -admin.password="$S3_ROOT_PASSWORD" \
  -filer.port=9002 \
  -webdav=false \
  -bucket="$BUCKET_NAME"
