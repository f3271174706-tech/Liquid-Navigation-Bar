#!/usr/bin/env bash
set -Eeuo pipefail

release_id="${RELEASE_ID:?Set RELEASE_ID to the release timestamp}"
artifact="${ARTIFACT:-/tmp/bar-fzp-release-${release_id}.tgz}"
expected_sha256="${EXPECTED_SHA256:?Set EXPECTED_SHA256 to the release archive checksum}"
release_dir="/opt/bar-fzp/releases/${release_id}"

printf '%s  %s\n' "${expected_sha256}" "${artifact}" | sha256sum --check --status
test ! -e "${release_dir}"

install -d -m 0755 /opt/bar-fzp/releases
install -d -m 0755 "${release_dir}"
tar -xzf "${artifact}" -C "${release_dir}"
mv "${release_dir}/dist" "${release_dir}/public"
mv "${release_dir}/deploy/server.mjs" "${release_dir}/server.mjs"
rmdir "${release_dir}/deploy"
chmod -R a+rX "${release_dir}"

install -o root -g root -m 0644 /tmp/bar-fzp.service /etc/systemd/system/bar-fzp.service
systemd-analyze verify /etc/systemd/system/bar-fzp.service

ln -s "${release_dir}" /opt/bar-fzp/current.next
mv -Tf /opt/bar-fzp/current.next /opt/bar-fzp/current

systemctl daemon-reload
systemctl enable --now bar-fzp.service
systemctl is-active --quiet bar-fzp.service
for _ in {1..20}; do
  if curl -fsS http://127.0.0.1:18030/healthz; then
    break
  fi
  sleep 0.25
done
curl -fsS http://127.0.0.1:18030/healthz >/dev/null
curl -fsSI http://127.0.0.1:18030/ | grep -F 'Location: /?playground'
ss -lntp | grep -E '127\.0\.0\.1:18030([[:space:]]|$)'

rm -f "${artifact}" /tmp/bar-fzp.service
