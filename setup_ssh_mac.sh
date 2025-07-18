#!/bin/bash

# SSH Setup Script for Mac to Linux Machine
# Copy and paste this entire script to your Mac terminal

echo "Setting up SSH key authentication for Linux machine..."

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key to authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCmrO7kSQCAD2DWakpoQjRuxcpS1kgLbhAkoYQSA6dDYJbzYPx5koQDR1ufuch1n3MLspcSmyp/zvZeyWW/HhBzZ0jg21dIvMZoSyiilUsfp3drjp09CQDFU3eqeVa+6ZXQFyITjPrgOp2OMdemxlVuSnKyBhvDRG0xRybJg9s9VPc40iRhmdraORAEsiaz14hWIezni8HKbA+uMgxaXWGrfvcr9Rku4QU/8uhDvJI6vjFV8KnwuMnMvexOlUoowbwprnZAm+ssZLrDPiL5c2DnIEM8HEBmPz0p8Q2B/yZVnMNHyb/spTfOlKPodUNnOmDQE9RAgaFkhSW3RGNMhsO46rO0eki2THsJ4SAEvZQZqOE8Pqwl0aXFMjQ69qAqcY689sGz5nwjs127BXiu4Nuks6afLPftI6Ca/o70BLkC0uYNKxX3mzvtHv43oJYNYFHgYP772knrihJjOefLN6c6SdGYWkqjrHw5jfIFc5CxSEzBrPA50YllwjtpXPiiTaD8FC+O2+a+8KXmNyoETPABto+M3267tcScgIZ5ocy/HFAqxDbujK2+WKvllUQtYxcdF7U6Rk8g0DypQvm2Ba48nxKoR+2lqaoQM+DadMv3Gzz54DTgMEm8Utn1eWQGxBRMHkOYHbJck2Ld1qQLTd+PTfgPQmdCIoy9v5bTvwRntw== winkidzz@beast" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# Create SSH config for easy connection
cat > ~/.ssh/config << 'EOF'
Host linux-beast
    HostName 192.168.1.170
    User winkidzz
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF

chmod 600 ~/.ssh/config

echo "SSH setup complete!"
echo ""
echo "You can now connect using:"
echo "  ssh linux-beast"
echo "  or"
echo "  ssh winkidzz@192.168.1.170"
echo ""
echo "Note: You may still be prompted for a password the first time."
echo "If you want to generate your own SSH key pair, run:"
echo "  ssh-keygen -t rsa -b 4096"
echo "  ssh-copy-id winkidzz@192.168.1.170" 