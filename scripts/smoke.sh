#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

export PRODUCT_SOURCE=fixture SMTP_PORT=1025 SMTP_SECURE=false SMTP_USER= SMTP_PASS=
export SALES_INBOX_EMAIL=sales@example.com ENQUIRY_FROM_EMAIL=enquiries@example.com

compose=(docker compose --env-file .env.example --project-name "catalogue-smoke-$$" -f docker-compose.yml)

cleanup() {
  local status=$?
  "${compose[@]}" down || {
    if (( status == 0 )); then status=1; fi
  }
  exit "$status"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"${compose[@]}" up --build -d --wait --wait-timeout 90

web="http://127.0.0.1:${WEB_PORT:-8080}"
mailpit="http://127.0.0.1:${MAILPIT_UI_PORT:-8025}"

get() {
  curl --fail --silent --show-error --max-time 10 "$1"
}

check_json() {
  node -e '
    const { readFileSync } = require("node:fs");
    const body = JSON.parse(readFileSync(0, "utf8"));
    const [check, reference] = process.argv.slice(1);

    function validate() {
      if (check === "health" && body.status === "ok") return;
      if (check === "top-rated" &&
          body.items?.map(({ id }) => id).join(",") === "3,5,11,12,18") return;
      if (check === "accepted" &&
          typeof body.enquiryId === "string" &&
          /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.enquiryId)) {
        process.stdout.write(body.enquiryId.slice(0, 8));
        return;
      }
      if (check === "mail" && body.total === 1 && body.messages?.length === 1 &&
          body.messages[0].Subject?.endsWith(`[ref ${reference}]`)) return;

      throw new Error(`Smoke check failed: ${check}`);
    }

    validate();
  ' "$@"
}

get "$web/" >/dev/null
get "$web/api/health" | check_json health
get "$web/api/v1/collections/top-rated" | check_json top-rated

response=$(curl --silent --show-error --max-time 10 --write-out $'\n%{http_code}' \
  --header 'Content-Type: application/json' \
  --data '{"productId":"3","name":"Compose Smoke","email":"customer@example.com","message":"Fixture smoke check."}' \
  "$web/api/v1/enquiries")
status=${response##*$'\n'}
if [[ $status != 202 ]]; then
  printf 'Expected HTTP 202 from enquiries, got %s.\n' "$status" >&2
  exit 1
fi
reference=$(printf '%s' "${response%$'\n'*}" | check_json accepted)
get "$mailpit/api/v1/messages" | check_json mail "$reference"

printf 'Home, API health, curated products, and Mailpit delivery passed.\n'
