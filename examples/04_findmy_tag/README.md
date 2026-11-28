# 04_findmy_tag — Apple FindMy / OpenHaystack 追踪器固件

将 `AESL0213C-TLSR8250`（尤其是屏幕损坏的板子）改造为超低功耗 Apple FindMy / OpenHaystack / macless-haystack 追踪器。

## 特性

- **完全开源、零密钥硬编码**：源码和预编译模板 `firmware/findmy_tag_template.bin` 中仅包含标准 28 字节占位符 `OFFLINEFINDINGPUBLICKEYHERE!`，使用 `patch_key.py` 注入你自己的公钥并自动重算 Telink CRC32。
- **严格符合 Apple Offline Finding 规范**：使用 **Random Static Address (`TxAdd=1`, `OWN_ADDRESS_RANDOM`)** 与标准 31 字节 `0x004C` (`12 19`) 广播负载。
- **超低功耗 Deep Retention**：2 秒广播间隔，两次广播之间自动进入深度保持休眠（使用片内 32kHz RC，无需外部 32.768kHz 晶振），两颗纽扣电池可续航数月以上。
- **开机自检**：冷启动时绿灯（`PB5`）闪烁 2 次后熄灭，休眠唤醒期间不亮灯省电。

## 使用方法

### 1. 编译模板（或直接使用 `firmware/findmy_tag_template.bin`）

```bash
make -C examples/04_findmy_tag all
```

### 2. 注入你自己的 FindMy 公钥

支持 OpenHaystack / macless-haystack 生成的 `.keys` 文件（切勿将你的 `.keys` 或注入后的 `.bin` 提交到公共仓库！）：

```bash
python3 examples/04_findmy_tag/patch_key.py \
  --keys /path/to/my_tag.keys \
  -i examples/04_findmy_tag/build/findmy_tag.bin \
  -o examples/04_findmy_tag/build/findmy_my_tag.bin
```

也可以直接通过 `--adv-key <Base64公钥>` 注入。脚本会自动打印预期广播的 BLE 随机静态 MAC。

### 3. 烧录并验证

```bash
./scripts/flash.sh examples/04_findmy_tag/build/findmy_my_tag.bin
```

上电后绿灯快闪 2 下熄灭，用手机 nRF Connect 或 Linux `bluetoothctl` 扫描，即可看到对应的随机 MAC 与 Apple (`0x004C`) `12 19 00 ...` 离线查找广播包。

### 4. 启动 `macless-haystack` 后端查看地图定位

目录 `docker/docker-compose.yml` 已配置好 `anisette` 与 `macless-haystack` 双服务（登录凭据保存在 Docker Volume 中，不会污染 git 仓库）：

```bash
cd examples/04_findmy_tag/docker

# 1. 先启动 anisette 认证服务
docker compose up -d anisette

# 2. 首次交互式运行 macless-haystack 登录 Apple ID（输入账号、密码与 2FA 验证码）
#    看到开始在 6176 端口提供服务后，按 Ctrl+C 退出
docker compose run --rm -it --service-ports macless-haystack

# 3. 转为后台常驻运行
docker compose up -d
```

启动后，在 `macless-haystack` Android App 或网页端设置中填入 `http://<本机局域网IP>:6176`，导入你的 `Private key` 即可刷新查看定位。
