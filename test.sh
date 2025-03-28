#!/bin/bash

# 生产流程追踪系统数据填充脚本
# 按照"入库 -> 贴膜 -> 切割 -> 检验 -> 出货"的顺序创建1000条记录

# 配置信息
SERVER_IP="localhost:3000"  # 修改为实际服务器IP和端口
TOTAL_BATCHES=1000          # 需要创建的批次总数
DELAY=0.3                   # 请求之间的延迟（秒）

# 函数：生成批次ID (格式: 25X0001)
function generate_batch_id {
    local index=$1
    local prefix="25"
    local letters=("A" "B" "C" "D" "E" "F")
    local letter=${letters[$((RANDOM % ${#letters[@]}))]}
    printf "%s%s%04d" "$prefix" "$letter" "$index"
}

# 函数：发送POST请求
function send_request {
    local batch_id=$1
    local process_type=$2
    
    # 构建JSON数据 - 注意这里使用batchId而不是batch_id
    local json_data="{\"batchId\":\"$batch_id\",\"processType\":\"$process_type\"}"
    
    # 发送请求并显示响应内容
    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$json_data" "http://$SERVER_IP/api/process" -w "\n%{http_code}")
    
    # 提取HTTP状态码和响应内容
    http_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | sed '$d')
    
    # 检查是否成功
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "[成功] $process_type: $batch_id"
    else
        echo "[失败] $process_type: $batch_id - 状态码: $http_code"
        echo "响应内容: $content"
    fi
    
    sleep $DELAY
}

# 主函数
function main {
    echo "开始填充数据: 计划创建 $TOTAL_BATCHES 个批次的流程数据"
    
    # 处理流程类型
    PROCESS_TYPES=("storage" "film" "cutting" "inspection" "shipping")
    
    # 创建1000个批次数据
    for ((i=1; i<=$TOTAL_BATCHES; i++)); do
        batch_id=$(generate_batch_id $i)
        echo "处理批次 $i/$TOTAL_BATCHES: $batch_id"
        
        # 按顺序处理5个流程
        for process_type in "${PROCESS_TYPES[@]}"; do
            send_request "$batch_id" "$process_type"
        done
        
        # 每50个批次显示进度
        if [ $((i % 50)) -eq 0 ]; then
            echo "----------------------------------------------------"
            echo "已处理: $i/$TOTAL_BATCHES 批次"
            echo "----------------------------------------------------"
        fi
    done
    
    echo "数据填充完成! 总批次数: $TOTAL_BATCHES"
}

# 执行主函数
main