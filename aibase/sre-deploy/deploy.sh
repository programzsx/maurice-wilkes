#!/bin/bash
# ============================================================
# Maurice Wilkes 自动部署脚本 v1.0.0
# 名词词典系统
# 目标: Alibaba Cloud ECS (8.160.174.178)
# 后端端口: 8010
# 前端端口: 5180
# ============================================================
set -e

VERSION=$(head -1 version.txt 2>/dev/null || echo "1.0.0")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ECS_HOST="8.160.174.178"
ECS_USER="root"
REMOTE_DIR="/home/maurice-wilkes"
SERVICE_NAME="maurice-wilkes"
APP_PORT=8010
WEB_PORT=5180

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo " Maurice Wilkes 部署 v$VERSION"
echo " $TIMESTAMP"
echo " 目标: $ECS_USER@$ECS_HOST:$REMOTE_DIR"
echo " API端口: $APP_PORT"
echo " Web端口: $WEB_PORT"
echo "=========================================="

echo "[1/8] 构建前端..."
cd "$PROJECT_ROOT/web"
npm install
npm run build
cd "$PROJECT_ROOT"

echo "[2/8] 打包后端与前端..."
TMPDIR=$(mktemp -d)
mkdir -p "$TMPDIR/server/app" "$TMPDIR/web"
cp -r "$PROJECT_ROOT/server/app/"* "$TMPDIR/server/app/"
cp "$PROJECT_ROOT/server/requirements.txt" "$TMPDIR/server/requirements.txt"
cp -r "$PROJECT_ROOT/web/dist/"* "$TMPDIR/web/"
tar czf /tmp/maurice-wilkes-$VERSION.tar.gz -C "$TMPDIR" server web
rm -rf "$TMPDIR"

echo "[3/8] 上传到 ECS..."
scp /tmp/maurice-wilkes-$VERSION.tar.gz $ECS_USER@$ECS_HOST:/tmp/

echo "[4/8] 部署文件与服务..."
ssh $ECS_USER@$ECS_HOST << ENDSSH
set -e

mkdir -p $REMOTE_DIR/server $REMOTE_DIR/web
cd $REMOTE_DIR

systemctl stop $SERVICE_NAME 2>/dev/null || true
fuser -k $APP_PORT/tcp 2>/dev/null || true
sleep 1

tar xzf /tmp/maurice-wilkes-$VERSION.tar.gz

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

cat > /etc/systemd/system/$SERVICE_NAME.service << EOFUNIT
[Unit]
Description=Maurice Wilkes API (名词词典)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REMOTE_DIR/server
EnvironmentFile=$REMOTE_DIR/server/.env
ExecStart=$REMOTE_DIR/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $APP_PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOFUNIT

systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

if ! command -v nginx >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nginx
fi

cat > /etc/nginx/sites-available/$SERVICE_NAME << EOFNGINX
server {
    listen $WEB_PORT;
    server_name _;

    root $REMOTE_DIR/web;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /docs {
        proxy_pass http://127.0.0.1:$APP_PORT/docs;
        proxy_set_header Host \$host;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:$APP_PORT/openapi.json;
        proxy_set_header Host \$host;
    }
}
EOFNGINX

ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/$SERVICE_NAME
nginx -t
systemctl reload nginx

rm -f /tmp/maurice-wilkes-*.tar.gz
ENDSSH

echo "[5/8] 等待服务启动..."
sleep 4

check_endpoint() {
    local label=$1 port=$2 path=$3 expected=$4
    local code
    code=$(ssh $ECS_USER@$ECS_HOST "curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:$port$path'" 2>/dev/null || echo "000")
    if [ "$code" = "$expected" ]; then
        echo "  OK $label (HTTP $code)"
    else
        echo "  FAIL $label (HTTP $code, expected $expected)"
        return 1
    fi
}

echo "[6/8] 后端健康检查..."
check_endpoint "Root" "$APP_PORT" "/" "200"
check_endpoint "DictTypes" "$APP_PORT" "/api/dict/types" "200"
check_endpoint "DictNouns" "$APP_PORT" "/api/dict-nouns?page=1&page_size=1" "200"
check_endpoint "Docs" "$APP_PORT" "/docs" "200"

echo "[7/8] 前端健康检查..."
check_endpoint "Web" "$WEB_PORT" "/" "200"

echo "[8/8] 清理本地包..."
rm -f /tmp/maurice-wilkes-$VERSION.tar.gz

echo ""
echo "=========================================="
echo " 部署完成 v$VERSION"
echo " Web:  http://$ECS_HOST:$WEB_PORT"
echo " API:  http://$ECS_HOST:$APP_PORT"
echo " Docs: http://$ECS_HOST:$APP_PORT/docs"
echo " 管理: systemctl [status|restart|stop] $SERVICE_NAME"
echo " 日志: journalctl -u $SERVICE_NAME -f"
echo "=========================================="
