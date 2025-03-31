#!/bin/bash

# 数据库连接参数
DB_HOST="localhost"  # 修改为您的数据库主机地址
DB_USER="root"       # 修改为您的数据库用户名
DB_PASS="root"   # 修改为您的数据库密码
DB_NAME="product_tracker"

# 确认提示
echo "警告: 此脚本将清空 $DB_NAME 数据库中的所有数据!"
echo "所有表数据将被永久删除，此操作不可恢复!"
read -p "确定要继续吗? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "操作已取消"
    exit 0
fi

# 获取所有表名
TABLES=$(mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SHOW TABLES;" | grep -v "Tables_in")

# 检查是否成功获取表名
if [ -z "$TABLES" ]; then
    echo "错误: 无法获取表列表或数据库中没有表"
    exit 1
fi

echo "以下表将被清空:"
echo "$TABLES"
echo ""

# 再次确认
read -p "最后确认: 是否清空以上所有表数据? (y/n): " FINAL_CONFIRM

if [ "$FINAL_CONFIRM" != "y" ]; then
    echo "操作已取消"
    exit 0
fi

# 禁用外键约束并清空所有表
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME << EOF
SET FOREIGN_KEY_CHECKS = 0;
$(for table in $TABLES; do echo "TRUNCATE TABLE \`$table\`;"; done)
SET FOREIGN_KEY_CHECKS = 1;
EOF

# 检查执行结果
if [ $? -eq 0 ]; then
    echo "成功: 所有表已清空"
    
    # 验证表是否为空
    for table in $TABLES; do
        COUNT=$(mysql -h $DB_HOST -u $DB_USER -p$DB_PASS -e "USE $DB_NAME; SELECT COUNT(*) FROM \`$table\`;" | grep -v "COUNT")
        echo "表 $table: $COUNT 条记录"
    done
else
    echo "错误: 清空表时出现问题"
    exit 1
fi

echo "数据库清空操作完成" 