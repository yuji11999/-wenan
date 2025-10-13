@echo off
echo ========================================
echo 正在为你生成SSH密钥...
echo ========================================
echo.

cd %USERPROFILE%

if not exist .ssh mkdir .ssh

cd .ssh

echo. | ssh-keygen -t rsa -b 4096 -C "gitee-key" -f id_rsa -N ""

echo.
echo ========================================
echo SSH密钥生成成功！
echo ========================================
echo.
echo 公钥内容如下（请复制整段内容）：
echo ----------------------------------------
type id_rsa.pub
echo.
echo ----------------------------------------
echo.
echo 请按照以下步骤操作：
echo 1. 复制上面显示的所有内容（从ssh-rsa开始到最后）
echo 2. 打开浏览器访问 https://gitee.com/profile/sshkeys
echo 3. 点击"添加公钥"按钮
echo 4. 将复制的内容粘贴到"公钥"文本框中
echo 5. 标题可以随便写，比如"我的电脑"
echo 6. 点击"确定"按钮
echo.
pause


