$ErrorActionPreference = "Stop"

$Version = Get-Content "$PSScriptRoot\version.txt" -First 1
if (-not $Version) { $Version = "1.0.0" }

$EcsHost = "8.160.174.178"
$EcsUser = "root"
$RemoteDir = "/home/maurice-wilkes"
$ServiceName = "maurice-wilkes"
$AppPort = 8010
$WebPort = 5180
$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$PackagePath = Join-Path $env:TEMP "maurice-wilkes-$Version.tar.gz"
$TempDir = Join-Path $env:TEMP "maurice-wilkes-package-$Version"
$RemoteScriptPath = Join-Path $env:TEMP "maurice-wilkes-remote-deploy.sh"

Write-Host "=== Maurice Wilkes Windows Deploy v$Version ==="

Write-Host "[1/7] Build web"
Push-Location "$ProjectRoot\web"
npm install
npm run build
Pop-Location

Write-Host "[2/7] Package"
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$TempDir\server\app", "$TempDir\web" | Out-Null
Copy-Item -Recurse "$ProjectRoot\server\app\*" "$TempDir\server\app\"
Copy-Item "$ProjectRoot\server\requirements.txt" "$TempDir\server\requirements.txt"
Copy-Item -Recurse "$ProjectRoot\web\dist\*" "$TempDir\web\"
Remove-Item -Force $PackagePath -ErrorAction SilentlyContinue
tar -czf $PackagePath -C $TempDir server web
Remove-Item -Recurse -Force $TempDir

Write-Host "[3/7] Upload"
scp $PackagePath "${EcsUser}@${EcsHost}:/tmp/"

Write-Host "[4/7] Remote deploy"
$RemoteScript = @"
set -e
mkdir -p $RemoteDir/server $RemoteDir/web
cd $RemoteDir
systemctl stop $ServiceName 2>/dev/null || true
fuser -k $AppPort/tcp 2>/dev/null || true
sleep 1
tar xzf /tmp/maurice-wilkes-$Version.tar.gz
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r server/requirements.txt
if [ ! -f server/.env ]; then
cat > server/.env << 'ENVEOF'
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-frances-allen}
APP_PORT=8010
ENVEOF
chmod 600 server/.env
else
    echo "  .env already exists, skipping."
fi
sed -i 's/^DB_NAME=.*/DB_NAME=frances-allen/' server/.env
cat > /etc/systemd/system/$ServiceName.service << 'EOFUNIT'
[Unit]
Description=Maurice Wilkes API (名词词典)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$RemoteDir/server
EnvironmentFile=$RemoteDir/server/.env
ExecStart=$RemoteDir/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $AppPort
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOFUNIT
systemctl daemon-reload
systemctl enable $ServiceName
systemctl start $ServiceName
if ! command -v nginx >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nginx
fi
cat > /etc/nginx/sites-available/$ServiceName << 'EOFNGINX'
server {
    listen $WebPort;
    server_name _;

    root $RemoteDir/web;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$AppPort;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
    }

    location /docs {
        proxy_pass http://127.0.0.1:$AppPort/docs;
        proxy_set_header Host `$host;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:$AppPort/openapi.json;
        proxy_set_header Host `$host;
    }
}
EOFNGINX
ln -sf /etc/nginx/sites-available/$ServiceName /etc/nginx/sites-enabled/$ServiceName
nginx -t
systemctl reload nginx
rm -f /tmp/maurice-wilkes-*.tar.gz
"@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($RemoteScriptPath, $RemoteScript, $Utf8NoBom)
scp $RemoteScriptPath "${EcsUser}@${EcsHost}:/tmp/maurice-wilkes-remote-deploy.sh"
ssh "${EcsUser}@${EcsHost}" "bash /tmp/maurice-wilkes-remote-deploy.sh && rm -f /tmp/maurice-wilkes-remote-deploy.sh"

Write-Host "[5/7] Wait"
Start-Sleep -Seconds 4

function Test-Endpoint($Label, $Url) {
    $Code = ssh "${EcsUser}@${EcsHost}" "curl -s -o /dev/null -w '%{http_code}' '$Url'"
    if ($Code -ne "200") {
        throw "$Label failed: HTTP $Code ($Url)"
    }
    Write-Host "  OK $Label HTTP $Code"
}

Write-Host "[6/7] Verify"
Test-Endpoint "Root" "http://127.0.0.1:$AppPort/"
Test-Endpoint "DictTypes" "http://127.0.0.1:$AppPort/api/dict/types"
Test-Endpoint "DictNouns" "http://127.0.0.1:$AppPort/api/dict-nouns?page=1&page_size=1"
Test-Endpoint "Docs" "http://127.0.0.1:$AppPort/docs"
Test-Endpoint "Web" "http://127.0.0.1:$WebPort/"

Write-Host "[7/7] Cleanup"
Remove-Item -Force $PackagePath -ErrorAction SilentlyContinue
Remove-Item -Force $RemoteScriptPath -ErrorAction SilentlyContinue

Write-Host "=== Done ==="
Write-Host "Web:  http://$EcsHost`:$WebPort"
Write-Host "API:  http://$EcsHost`:$AppPort"
Write-Host "Docs: http://$EcsHost`:$AppPort/docs"
