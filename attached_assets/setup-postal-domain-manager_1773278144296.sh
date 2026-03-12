#!/bin/bash
# ============================================================
# ARGIFLOW POSTAL DOMAIN MANAGER SETUP
# Run this ONCE on your Hetzner VPS (89.167.73.73)
# This enables ArgiFlow to programmatically add client domains
# ============================================================

echo "Setting up ArgiFlow domain management..."

# 1. Create SSH key for ArgiFlow to connect to Postal DB
mkdir -p /etc/argiflow
ssh-keygen -t ed25519 -f /etc/argiflow/postal_key -N "" -C "argiflow-domain-manager"

# 2. Add the public key to authorized_keys (self-SSH)
cat /etc/argiflow/postal_key.pub >> /root/.ssh/authorized_keys

# 3. Create domain management script
cat > /usr/local/bin/postal-add-domain.sh << 'EOF'
#!/bin/bash
# Usage: postal-add-domain.sh <domain> <dkim_selector> <dkim_private_key>
DOMAIN=$1
SELECTOR=$2
PRIVATE_KEY=$3
SERVER_ID=1

docker exec postal-mariadb mysql -u postal -ppostalpassword postal -e "
  INSERT INTO domains (server_id, name, dkim_private_key, dkim_identifier_string, created_at, updated_at)
  VALUES ($SERVER_ID, '$DOMAIN', '$PRIVATE_KEY', '$SELECTOR', NOW(), NOW())
  ON DUPLICATE KEY UPDATE updated_at=NOW();
  SELECT LAST_INSERT_ID() as domain_id;
"
EOF

chmod +x /usr/local/bin/postal-add-domain.sh

# 4. Print the private key for ArgiFlow Replit secrets
echo ""
echo "========================================"
echo "SETUP COMPLETE"
echo "========================================"
echo ""
echo "Add these to your Replit Secrets:"
echo ""
echo "POSTAL_DB_HOST=89.167.73.73"
echo "POSTAL_DB_PASS=postalpassword"
echo "POSTAL_SSH_KEY_PATH=/etc/argiflow/postal_key"
echo ""
echo "SSH Public Key (already added to authorized_keys):"
cat /etc/argiflow/postal_key.pub
echo ""
echo "Private Key for Replit (POSTAL_SSH_PRIVATE_KEY):"
cat /etc/argiflow/postal_key
echo ""
echo "========================================"
