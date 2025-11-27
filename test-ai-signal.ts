/**
 * 测试 AI 交易信号解析和执行
 */

import { WeexApiClient } from './weex';
import { 
  AITradingSignal, 
  parseAITradingSignal, 
  validateAITradingSignal,
  OrderDetail 
} from './ai-trading-signal';

// 模拟 AI 返回的 JSON 响应
const mockAIResponse1 = `{
  "analysis": {
    "marketTrend": "BTC 当前在 91000 附近震荡，1小时 K线显示从 87000 反弹至 91000，短期上涨趋势明显。5分钟 K线显示价格在 91000-91200 区间震荡，缺乏明确方向。",
    "positionStatus": "当前持有多空对冲仓位各 0.005 BTC，多仓持仓价 91226.5 亏损 0.23%，空仓持仓价 90669.9 亏损 0.38%，总亏损 2.78 USDT。多空基本平衡但均处于小幅亏损状态。",
    "riskAssessment": "账户余额 950 USDT，保证金使用率 0%，风险等级 LOW，账户健康状况良好。"
  },
  "signal": {
    "action": "HOLD",
    "confidence": "MEDIUM",
    "reasoning": "当前市场处于震荡整理阶段，缺乏明确的突破信号。现有持仓亏损较小且多空平衡，无需急于操作。建议等待价格突破 91500 或跌破 90500 后再做决策。"
  },
  "execution": {
    "hasOrder": false,
    "orders": []
  },
  "riskWarning": "市场波动较大，短期方向不明确，避免频繁交易。"
}`;

const mockAIResponse2 = `{
  "analysis": {
    "marketTrend": "BTC 从 87000 强势反弹至 92000，1小时 K线连续上涨，5分钟 K线显示价格在 92000 附近遇阻回落。订单簿显示 92000 上方卖盘压力较大。",
    "positionStatus": "空仓持仓价 90669.9，当前价 92000，亏损约 2.9%，接近止损线。多仓持仓价 91226.5，当前价 92000，盈利约 1.7%，可考虑止盈。",
    "riskAssessment": "账户健康良好，但空仓亏损扩大，需要及时处理以控制风险。"
  },
  "signal": {
    "action": "CLOSE_SHORT",
    "confidence": "HIGH",
    "reasoning": "空仓亏损接近 3%，且市场短期上涨趋势明显，继续持有空仓风险较大。建议平掉空仓止损，保留多仓继续持有。"
  },
  "execution": {
    "hasOrder": true,
    "orders": [
      {
        "type": "4",
        "typeDescription": "4-平空",
        "size": "0.0050",
        "priceType": "MARKET",
        "price": "92000.0",
        "reasoning": "市价平空仓止损，避免亏损进一步扩大"
      }
    ]
  },
  "riskWarning": "平仓后将只剩多仓，单边持仓风险增加，需关注市场回调风险。"
}`;

/**
 * 执行交易信号
 */
async function executeAITradingSignal(client: WeexApiClient, signal: AITradingSignal, dryRun: boolean = true) {
  console.log('\n=== 执行 AI 交易信号 ===\n');
  
  // 显示分析结果
  console.log('📊 市场分析:');
  console.log(`  趋势: ${signal.analysis.marketTrend}`);
  console.log(`  持仓: ${signal.analysis.positionStatus}`);
  console.log(`  风险: ${signal.analysis.riskAssessment}`);
  console.log('');
  
  // 显示交易信号
  console.log('🎯 交易信号:');
  console.log(`  操作: ${signal.signal.action}`);
  console.log(`  置信度: ${signal.signal.confidence}`);
  console.log(`  理由: ${signal.signal.reasoning}`);
  console.log('');
  
  // 显示风险提示
  console.log(`⚠️  风险提示: ${signal.riskWarning}`);
  console.log('');
  
  // 执行订单
  if (signal.execution.hasOrder && signal.execution.orders.length > 0) {
    console.log(`📝 待执行订单数量: ${signal.execution.orders.length}`);
    console.log('');
    
    for (let i = 0; i < signal.execution.orders.length; i++) {
      const order = signal.execution.orders[i];
      console.log(`订单 ${i + 1}:`);
      console.log(`  类型: ${order.typeDescription}`);
      console.log(`  数量: ${order.size} BTC`);
      console.log(`  价格类型: ${order.priceType}`);
      console.log(`  价格: ${order.price} USDT`);
      console.log(`  理由: ${order.reasoning}`);
      console.log('');
      
      if (dryRun) {
        console.log('  [模拟模式] 订单未实际执行');
      } else {
        // 实际执行订单
        try {
          const result = await client.placeOrder({
            symbol: 'cmt_btcusdt',
            client_oid: `ai_${order.type}_${Date.now()}`,
            size: order.size,
            type: order.type,
            order_type: '0',
            match_price: order.priceType === 'MARKET' ? '1' : '0',
            price: order.priceType === 'MARKET' ? '' : order.price,
            marginMode: 1,
            separatedMode: 1
          });
          console.log(`  ✅ 订单执行成功: ${result.client_oid}`);
        } catch (error) {
          console.error(`  ❌ 订单执行失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      console.log('');
    }
  } else {
    console.log('💤 无需执行订单（观望）');
  }
  
  console.log('='.repeat(50));
}

/**
 * 主测试函数
 */
async function main() {
  console.log('=== 测试 AI 交易信号解析 ===\n');
  
  // 测试 1: 观望信号
  console.log('测试 1: 解析观望信号');
  console.log('-'.repeat(50));
  try {
    const signal1 = parseAITradingSignal(mockAIResponse1);
    const isValid1 = validateAITradingSignal(signal1);
    console.log(`✅ 解析成功，信号有效: ${isValid1}`);
    console.log(`操作: ${signal1.signal.action}, 置信度: ${signal1.signal.confidence}`);
  } catch (error) {
    console.error(`❌ 解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');
  
  // 测试 2: 平仓信号
  console.log('测试 2: 解析平仓信号');
  console.log('-'.repeat(50));
  try {
    const signal2 = parseAITradingSignal(mockAIResponse2);
    const isValid2 = validateAITradingSignal(signal2);
    console.log(`✅ 解析成功，信号有效: ${isValid2}`);
    console.log(`操作: ${signal2.signal.action}, 置信度: ${signal2.signal.confidence}`);
    console.log(`订单数量: ${signal2.execution.orders.length}`);
    
    // 模拟执行（不实际下单）
    const client = new WeexApiClient(
      process.env.WEEX_API_KEY || '',
      process.env.WEEX_SECRET_KEY || '',
      process.env.WEEX_PASSPHRASE || ''
    );
    
    await executeAITradingSignal(client, signal2, true);
  } catch (error) {
    console.error(`❌ 解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error);

