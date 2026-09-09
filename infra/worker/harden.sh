#!/usr/bin/env bash
# Harden the worker server's SSH surface.
#
#   bash ~/mykavo/infra/worker/harden.sh
#
# Port 22 is reachable from the whole internet, which is normal for a cloud
# VM but means the login prompt is under constant automated attack. This
# closes the easy paths and bans the machines that keep knocking.
#
# It deliberately does NOT restrict port 22 to a single IP: home addresses
# change, and locking yourself out of the only host running your product is
# worse than the risk being mitigated. The README explains how to add that
# restriction, with its recovery path, if you want it.
set -euo pipefail

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "Installing fail2ban and unattended security upgrades"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban unattended-upgrades >/dev/null

say "Configuring fail2ban for SSH"
# Ubuntu 24.04 ships without rsyslog, so /var/log/auth.log does not exist and
# fail2ban's stock sshd jail silently watches a file that is never written -
# running, reporting healthy, banning nobody. It has to read the journal.
sudo tee /etc/fail2ban/jail.local >/dev/null <<'CONF'
[DEFAULT]
backend = systemd
# Ban for an hour after 4 failures within 10 minutes.
bantime  = 1h
findtime = 10m
maxretry = 4
# Repeat offenders get progressively longer bans.
bantime.increment = true
bantime.factor    = 2
bantime.maxtime   = 1w

[sshd]
enabled = true
CONF

sudo systemctl enable --now fail2ban >/dev/null
sudo systemctl restart fail2ban

say "Hardening sshd"
sudo tee /etc/ssh/sshd_config.d/99-mykavo-hardening.conf >/dev/null <<'CONF'
# Keys only. Oracle's image already defaults to this; stated explicitly so a
# future image or package update cannot quietly re-enable passwords.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
# Fewer guesses per connection, so a single session cannot grind through keys.
MaxAuthTries 3
# Drop half-open connections faster - the cheapest denial-of-service against
# sshd is opening connections and never authenticating.
MaxStartups 10:30:60
LoginGraceTime 30
CONF

# Validate BEFORE restarting. A bad sshd config plus a restart is how people
# lock themselves out of a server permanently.
if ! sudo sshd -t; then
  say "sshd config is invalid - reverting, nothing restarted"
  sudo rm -f /etc/ssh/sshd_config.d/99-mykavo-hardening.conf
  exit 1
fi
sudo systemctl reload ssh

say "Enabling automatic security updates"
echo 'Unattended-Upgrade::Automatic-Reboot "false";' \
  | sudo tee /etc/apt/apt.conf.d/52-mykavo-no-auto-reboot >/dev/null
sudo systemctl enable --now unattended-upgrades >/dev/null

say "Done"
echo "fail2ban status:"
sudo fail2ban-client status sshd || true
echo
echo "Keep THIS session open and confirm a NEW ssh login works before closing it."
