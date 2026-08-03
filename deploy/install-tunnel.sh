#!/usr/bin/env bash
set -Eeuo pipefail

tunnel_name="bar-fzp-me"
hostname="bar.fzp.me"

existing_count="$(cloudflared tunnel list --name "${tunnel_name}" --output json | python3 -c 'import json,sys; print(len(json.load(sys.stdin) or []))')"
if [ "${existing_count}" = "0" ]; then
  cloudflared tunnel create "${tunnel_name}"
elif [ "${existing_count}" != "1" ]; then
  echo "Expected zero or one tunnel named ${tunnel_name}; found ${existing_count}" >&2
  exit 1
fi

tunnel_id="$(cloudflared tunnel list --name "${tunnel_name}" --output json | python3 -c 'import json,sys; rows=json.load(sys.stdin); print(rows[0]["id"])')"
source_credentials="/root/.cloudflared/${tunnel_id}.json"
target_credentials="/etc/cloudflared/bar-fzp-me.json"
target_config="/etc/cloudflared/bar-fzp-me.yml"

test -f "${source_credentials}"
test ! -e "${target_credentials}"
test ! -e "${target_config}"

cloudflared tunnel route dns "${tunnel_name}" "${hostname}"

install -o root -g root -m 0600 "${source_credentials}" "${target_credentials}"
cat >"${target_config}" <<EOF
tunnel: ${tunnel_id}
credentials-file: ${target_credentials}

ingress:
  - hostname: ${hostname}
    service: http://127.0.0.1:18030
    originRequest:
      connectTimeout: 10s
  - service: http_status:404
EOF
chown root:root "${target_config}"
chmod 0644 "${target_config}"

cloudflared --config "${target_config}" tunnel ingress validate
install -o root -g root -m 0644 /tmp/cloudflared-bar-fzp-me.service /etc/systemd/system/cloudflared-bar-fzp-me.service
systemd-analyze verify /etc/systemd/system/cloudflared-bar-fzp-me.service

systemctl daemon-reload
systemctl enable --now cloudflared-bar-fzp-me.service
systemctl is-active --quiet cloudflared-bar-fzp-me.service

rm -f "${source_credentials}" /tmp/cloudflared-bar-fzp-me.service
printf 'TUNNEL_ID=%s\n' "${tunnel_id}"
