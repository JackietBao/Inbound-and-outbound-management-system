#!/bin/bash

# 定义服务器地址
SERVER_URL="http://localhost:3000/api/process"

# 定义流程顺序
declare -a PROCESS_TYPES=("storage" "film" "cutting" "inspection" "shipping")

# 定义流程对应的固定员工
declare -A PROCESS_EMPLOYEES=(
  ["storage"]="张三"
  ["film"]="李四"
  ["cutting"]="王五"
  ["inspection"]="钱七"
  ["shipping"]="孙八"
)

# 生成100个公司名称
generate_company_names() {
  local prefixes=("北方" "南方" "东方" "西方" "中原" "沿海" "山东" "江苏" "浙江" "广东" "福建" "湖南" "湖北" "河南" "河北" "安徽" "四川" "重庆" "云南" "贵州")
  local types=("科技" "电子" "材料" "制造" "贸易" "物流" "印刷" "包装" "金属" "化工" "机械" "设备" "汽车" "食品" "医药" "能源" "建材" "纺织" "服装" "家居")
  local suffixes=("有限公司" "股份公司" "集团" "企业" "工厂")
  
  local companies=()
  for ((i=1; i<=100; i++)); do
    local prefix=${prefixes[$RANDOM % ${#prefixes[@]}]}
    local type=${types[$RANDOM % ${#types[@]}]}
    local suffix=${suffixes[$RANDOM % ${#suffixes[@]}]}
    local company="${prefix}${type}${suffix}"
    companies+=("$company")
  done
  
  echo "${companies[@]}"
}

# 生成公司列表
declare -a COMPANIES=($(generate_company_names))

# 检查curl命令是否可用
if ! command -v curl &> /dev/null; then
  echo "错误: 需要安装curl命令"
  exit 1
fi

echo "开始生成100个企业的批次数据（交错进行）..."

# 计数器
success_count=0
fail_count=0
total_requests=0

# 字母和数字集合，用于生成批次ID
CHARS="0123456789ABCDEF"

# 创建批次任务队列
declare -a BATCH_QUEUE=()
declare -A COMPANY_BATCH_COUNTS=()
total_batches=0

echo "准备批次任务..."

# 为每个公司生成批次并添加到队列中
for ((company_idx=0; company_idx<100; company_idx++)); do
  COMPANY=${COMPANIES[$company_idx]}
  
  # 为每个公司生成5-50个批次
  BATCH_COUNT=$((5 + RANDOM % 46))
  COMPANY_BATCH_COUNTS[$COMPANY]=$BATCH_COUNT
  ((total_batches+=BATCH_COUNT))
  
  # 生成该公司的所有批次
  for ((i=1; i<=$BATCH_COUNT; i++)); do
    # 生成7位字符的批次ID
    BATCH_ID=""
    for ((j=0; j<7; j++)); do
      BATCH_ID+=${CHARS:$((RANDOM % ${#CHARS})):1}
    done
    
    # 添加到队列 (格式: "公司名:批次ID:批次序号")
    BATCH_QUEUE+=("$COMPANY:$BATCH_ID:$i/$BATCH_COUNT")
  done
done

# 打乱批次队列顺序，模拟交错进行
echo "正在随机打乱批次顺序..."
BATCH_QUEUE_SIZE=${#BATCH_QUEUE[@]}
for ((i=BATCH_QUEUE_SIZE-1; i>0; i--)); do
  j=$((RANDOM % (i+1)))
  temp=${BATCH_QUEUE[i]}
  BATCH_QUEUE[i]=${BATCH_QUEUE[j]}
  BATCH_QUEUE[j]=$temp
done

echo "开始处理批次..."

# 公司批次计数器
declare -A COMPANY_COMPLETED=()

# 处理队列中的每个批次
for ((queue_idx=0; queue_idx<BATCH_QUEUE_SIZE; queue_idx++)); do
  # 解析批次信息
  IFS=':' read -r COMPANY BATCH_ID BATCH_NUM <<< "${BATCH_QUEUE[$queue_idx]}"
  
  # 更新完成计数
  COMPANY_COMPLETED[$COMPANY]=$((${COMPANY_COMPLETED[$COMPANY]:-0} + 1))
  
  echo "====== 处理批次 $((queue_idx+1))/$BATCH_QUEUE_SIZE ======"
  echo "公司: $COMPANY (进度: ${COMPANY_COMPLETED[$COMPANY]}/${COMPANY_BATCH_COUNTS[$COMPANY]})"
  echo "批次ID: $BATCH_ID ($BATCH_NUM)"
  
  # 按顺序处理每个流程步骤
  for PROCESS_TYPE in "${PROCESS_TYPES[@]}"; do
    # 根据流程类型指定固定员工
    EMPLOYEE=${PROCESS_EMPLOYEES[$PROCESS_TYPE]}
    
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
    
    # 添加延迟以避免请求过快
    sleep 0.1
  done
  
  # 每10个批次显示进度摘要
  if ((queue_idx % 10 == 9)); then
    echo "=== 批次进度摘要 (${queue_idx+1}/$BATCH_QUEUE_SIZE) ==="
    # 显示前5个有进度的公司
    count=0
    for company in "${!COMPANY_COMPLETED[@]}"; do
      if [ ${COMPANY_COMPLETED[$company]} -gt 0 ]; then
        echo "- $company: ${COMPANY_COMPLETED[$company]}/${COMPANY_BATCH_COUNTS[$company]}"
        ((count++))
      fi
      if [ $count -ge 5 ]; then break; fi
    done
  fi
done

# 打印统计信息
echo "========== 生成完成 =========="
echo "总公司数: 100"
echo "总批次数: $total_batches (每个公司5-50个批次)"
echo "总请求数: $total_requests"
echo "成功请求: $success_count"
echo "失败请求: $fail_count"
echo "成功率: $(echo "scale=2; $success_count*100/$total_requests" | bc)%"

echo -e "\n公司批次完成情况:"
for company in "${!COMPANY_BATCH_COUNTS[@]}"; do
  echo "- $company: ${COMPANY_COMPLETED[$company]:-0}/${COMPANY_BATCH_COUNTS[$company]}"
done

echo "==============================="