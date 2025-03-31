#!/bin/bash

# 定义服务器地址
SERVER_URL="http://192.168.137.136:3000/api/process"

# 定义流程顺序
declare -a PROCESS_TYPES=("storage" "film" "cutting" "inspection" "shipping")

# 定义示例员工姓名
declare -a EMPLOYEES=("张三" "李四" "王五" "赵六" "钱七" "孙八" "周九" "吴十")

# 定义示例公司名称
declare -a COMPANIES=("华宇科技" "东方材料" "北辰制造" "南洋贸易" "西山物流" "广田印刷" "远大包装" "鑫源金属")

# 检查curl命令是否可用
if ! command -v curl &> /dev/null; then
  echo "错误: 需要安装curl命令"
  exit 1
fi

# 设置要生成的批次数量
BATCH_COUNT=10

echo "开始生成$BATCH_COUNT个批次的完整流程数据..."

# 计数器
success_count=0
fail_count=0
total_requests=0

# 字母和数字集合，用于生成批次ID
CHARS="0123456789ABCDEF"

# 循环处理每个批次
for ((i=1; i<=$BATCH_COUNT; i++)); do
  # 生成7位字符的批次ID (格式: 2CB0257)
  BATCH_ID=""
  for ((j=0; j<7; j++)); do
    BATCH_ID+=${CHARS:$((RANDOM % ${#CHARS})):1}
  done
  
  # 随机选择公司
  COMPANY=${COMPANIES[$RANDOM % ${#COMPANIES[@]}]}
  
  echo "========== 处理批次 $i/$BATCH_COUNT: $BATCH_ID - $COMPANY =========="
  
  # 按顺序处理每个流程步骤
  for PROCESS_TYPE in "${PROCESS_TYPES[@]}"; do
    # 随机选择员工
    EMPLOYEE=${EMPLOYEES[$RANDOM % ${#EMPLOYEES[@]}]}
    
    # 构建JSON请求体
    JSON_DATA=$(cat <<EOF
{
  "batchId": "$BATCH_ID",
  "processType": "$PROCESS_TYPE",
  "employee": "$EMPLOYEE",
  "company": "$COMPANY"
}
EOF
    )
    
    # 发送POST请求
    echo "  发送请求: 流程=$PROCESS_TYPE, 员工=$EMPLOYEE"
    
    RESPONSE=$(curl -s -X POST "$SERVER_URL/" \
      -H "Content-Type: application/json" \
      -d "$JSON_DATA")
    
    # 检查响应
    ((total_requests++))
    if echo "$RESPONSE" | grep -q "error\|失败\|无效"; then
      echo "  请求失败: $RESPONSE"
      ((fail_count++))
      # 如果一个步骤失败，就中止这个批次的后续步骤
      break
    else
      echo "  请求成功"
      ((success_count++))
    fi
    
    # 添加延迟以避免请求过快 - 使用2秒延迟
    sleep 0.3
  done
done

# 打印统计信息
echo "========== 生成完成 =========="
echo "总批次: $BATCH_COUNT"
echo "总请求: $total_requests"
echo "成功: $success_count"
echo "失败: $fail_count"
echo "成功率: $(echo "scale=2; $success_count*100/$total_requests" | bc)%"
echo "==============================="