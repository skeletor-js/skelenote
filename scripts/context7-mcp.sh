#!/bin/bash
# Export the key explicitly to ensure it's available
export CONTEXT7_API_KEY="ctx7sk-64b629ab-d64f-4701-86c6-a06c9b01d2ad"

# Execute via npx, redirecting stderr to /dev/null to prevent protocol corruption
# (Use 'exec' to replace the shell process)
exec npx -y @upstash/context7-mcp
