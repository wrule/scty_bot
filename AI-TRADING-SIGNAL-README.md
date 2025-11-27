# AI 交易信号系统使用指南

## 概述

这是一个基于 AI 的马丁格尔多空对冲交易信号系统，用于 BTC/USDT 期货交易。系统通过分析市场数据、账户风险和持仓情况，生成结构化的交易建议。

**运行模式**：系统每 5 分钟获取一次最新市场数据并提交给 AI 分析，AI 根据当前市场状况决定是否需要操作。无需 WebSocket 实时推送，无需设置止盈止损。

## 核心文件

### 1. `ai-trading-prompt.md`
- **作用**：AI 交易分析指令模板
- **内容**：
  - 马丁格尔策略核心原则
  - 仓位管理规则（补仓、平仓、开仓条件）
  - 市场分析要点
  - JSON 输出格式规范
  - 详细的输出示例

### 2. `ai-trading-signal.ts`
- **作用**：TypeScript 接口定义
- **功能**：
  - 定义 AI 交易信号的数据结构
  - 提供 JSON 解析函数 `parseAITradingSignal()`
  - 提供信号验证函数 `validateAITradingSignal()`

### 3. `weex.ts`
- **作用**：Weex API 客户端
- **关键方法**：
  - `getAITradingContext()` - 获取结构化市场数据（JSON）
  - `getAITradingContextText()` - 获取格式化文本报告（包含 AI prompt）
  - `placeOrder()` - 下单
  - `closePosition()` - 平仓

## 使用流程

### 步骤 1: 获取市场数据和 AI Prompt

```typescript
import { WeexApiClient } from './weex';

const client = new WeexApiClient(
  process.env.WEEX_API_KEY!,
  process.env.WEEX_SECRET_KEY!,
  process.env.WEEX_PASSPHRASE!
);

// 获取包含 AI prompt 的完整文本报告
const contextText = await client.getAITradingContextText('cmt_btcusdt');

// contextText 包含：
// 1. 最近交易记录（10条）
// 2. 市场数据（1小时和5分钟K线、订单簿深度）
// 3. 账户风险（余额、杠杆、保证金、风险评估）
// 4. 当前持仓（持仓价格、当前价格、盈亏）
// 5. AI 交易分析指令（来自 ai-trading-prompt.md）
```

### 步骤 2: 将数据发送给 AI

```typescript
// 使用 OpenAI API、Claude API 或其他 LLM
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "user",
      content: contextText
    }
  ],
  temperature: 0.7
});

const aiJsonResponse = response.choices[0].message.content;
```

### 步骤 3: 解析 AI 返回的 JSON

```typescript
import { parseAITradingSignal, validateAITradingSignal } from './ai-trading-signal';

try {
  // 解析 JSON
  const signal = parseAITradingSignal(aiJsonResponse);
  
  // 验证信号
  if (!validateAITradingSignal(signal)) {
    throw new Error('Invalid trading signal');
  }
  
  console.log('操作:', signal.signal.action);
  console.log('置信度:', signal.signal.confidence);
  console.log('理由:', signal.signal.reasoning);
  
} catch (error) {
  console.error('解析失败:', error);
}
```

### 步骤 4: 执行交易信号

```typescript
if (signal.execution.hasOrder) {
  for (const order of signal.execution.orders) {
    // 构建订单参数
    const orderParams = {
      symbol: 'cmt_btcusdt',
      client_oid: `ai_${order.type}_${Date.now()}`,
      size: order.size,
      type: order.type, // "1"-开多, "2"-开空, "3"-平多, "4"-平空
      order_type: '0',  // 普通订单
      match_price: order.priceType === 'MARKET' ? '1' : '0',
      price: order.priceType === 'MARKET' ? '' : order.price,
      marginMode: 1,    // 全仓模式
      separatedMode: 1  // 合并模式
    };
    
    // 执行订单
    const result = await client.placeOrder(orderParams);
    console.log('订单执行成功:', result.client_oid);
  }
} else {
  console.log('AI 建议观望，无需操作');
}
```

## AI 返回的 JSON 结构

```typescript
{
  "analysis": {
    "marketTrend": "市场趋势分析",
    "positionStatus": "持仓状态评估",
    "riskAssessment": "风险评估"
  },
  "signal": {
    "action": "HOLD | OPEN_LONG | OPEN_SHORT | CLOSE_LONG | CLOSE_SHORT | ADD_LONG | ADD_SHORT",
    "confidence": "HIGH | MEDIUM | LOW",
    "reasoning": "操作理由"
  },
  "execution": {
    "hasOrder": true,
    "orders": [
      {
        "type": "1 | 2 | 3 | 4",
        "typeDescription": "订单类型描述",
        "size": "0.0050",
        "priceType": "MARKET | LIMIT",
        "price": "91000.0",
        "reasoning": "订单理由"
      }
    ]
  },
  "riskWarning": "风险提示"
}
```

## 测试

### 测试市场数据获取
```bash
npx tsx test-ai-context.ts
```

### 测试信号解析
```bash
npx tsx test-ai-signal.ts
```

## 注意事项

1. **风险控制**：AI 建议仅供参考，实际交易需要人工审核
2. **模拟测试**：建议先在模拟模式下测试，确认无误后再实盘
3. **运行频率**：建议每 5 分钟获取一次市场数据并分析，无需更频繁
4. **保证金管理**：确保账户有足够保证金，避免强平风险
5. **JSON 格式**：AI 必须返回纯 JSON，不能包含 markdown 标记
6. **无止盈止损**：系统每 5 分钟重新分析，无需设置止盈止损价格

## 策略特点

- **马丁格尔策略**：通过逐步加仓降低平均成本
- **多空对冲**：同时持有多空仓位，降低单边风险
- **稳健盈利**：目标周收益率 3-8%，避免激进操作
- **风险延后**：通过合理仓位管理，将爆仓风险推迟到极端行情
- **及时止盈**：盈利 2-5% 时考虑平仓，锁定利润

## 常见问题

**Q: AI 返回的 JSON 包含 markdown 标记怎么办？**
A: `parseAITradingSignal()` 函数会自动清理 ```json 标记，但建议在 prompt 中强调输出纯 JSON。

**Q: 如何处理 AI 建议观望的情况？**
A: 当 `signal.action` 为 `HOLD` 时，`execution.hasOrder` 为 false，无需执行任何订单。

**Q: 可以同时执行多个订单吗？**
A: 可以，`execution.orders` 是数组，可以包含多个订单（如先平仓再开仓）。

**Q: 如何调整策略参数？**
A: 修改 `ai-trading-prompt.md` 中的参数，如止盈阈值、止损阈值、ROI 目标等。

