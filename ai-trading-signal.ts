/**
 * AI 交易信号接口定义
 * 用于解析 AI 返回的交易建议 JSON
 */

/**
 * 市场分析
 */
export interface MarketAnalysis {
  /** 市场趋势分析（2-3句话） */
  marketTrend: string;
  /** 持仓状态评估（2-3句话） */
  positionStatus: string;
  /** 风险评估（1-2句话） */
  riskAssessment: string;
}

/**
 * 交易动作类型
 */
export type TradingAction = 
  | 'HOLD'          // 观望，不操作
  | 'OPEN_LONG'     // 开多仓
  | 'OPEN_SHORT'    // 开空仓
  | 'CLOSE_LONG'    // 平多仓
  | 'CLOSE_SHORT'   // 平空仓
  | 'ADD_LONG'      // 加多仓（补仓）
  | 'ADD_SHORT';    // 加空仓（补仓）

/**
 * 信号置信度
 */
export type SignalConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 交易信号
 */
export interface TradingSignal {
  /** 操作类型 */
  action: TradingAction;
  /** 信号置信度 */
  confidence: SignalConfidence;
  /** 操作理由（2-3句话） */
  reasoning: string;
}

/**
 * 订单类型（对应 Weex API）
 */
export type OrderType = '1' | '2' | '3' | '4';
// 1-开多, 2-开空, 3-平多, 4-平空

/**
 * 价格类型
 */
export type PriceType = 'MARKET' | 'LIMIT';

/**
 * 订单详情
 * 注意：系统每 5 分钟更新一次，无需设置止盈止损
 */
export interface OrderDetail {
  /** 订单类型：1-开多, 2-开空, 3-平多, 4-平空 */
  type: OrderType;
  /** 类型描述（方便理解） */
  typeDescription: string;
  /** 订单数量（字符串格式） */
  size: string;
  /** 价格类型：MARKET-市价, LIMIT-限价 */
  priceType: PriceType;
  /** 订单价格（限价单必填，市价单填当前价格） */
  price: string;
  /** 此订单的具体理由 */
  reasoning: string;
}

/**
 * 执行细节
 */
export interface ExecutionDetail {
  /** 是否有具体订单 */
  hasOrder: boolean;
  /** 订单数组（可以包含多个订单） */
  orders: OrderDetail[];
}

/**
 * AI 交易信号完整结构
 */
export interface AITradingSignal {
  /** 分析部分 */
  analysis: MarketAnalysis;
  /** 交易信号 */
  signal: TradingSignal;
  /** 执行细节 */
  execution: ExecutionDetail;
  /** 风险提示 */
  riskWarning: string;
}

/**
 * 解析 AI 返回的 JSON 字符串
 * @param jsonString - AI 返回的 JSON 字符串
 * @returns 解析后的交易信号对象
 */
export function parseAITradingSignal(jsonString: string): AITradingSignal {
  try {
    // 移除可能的 markdown 代码块标记
    let cleanJson = jsonString.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const signal: AITradingSignal = JSON.parse(cleanJson);
    
    // 验证必要字段
    if (!signal.analysis || !signal.signal || !signal.execution) {
      throw new Error('Invalid AI trading signal: missing required fields');
    }
    
    return signal;
  } catch (error) {
    throw new Error(`Failed to parse AI trading signal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 验证交易信号是否有效
 * @param signal - 交易信号对象
 * @returns 是否有效
 */
export function validateAITradingSignal(signal: AITradingSignal): boolean {
  // 检查必要字段
  if (!signal.analysis?.marketTrend || !signal.analysis?.positionStatus || !signal.analysis?.riskAssessment) {
    return false;
  }
  
  if (!signal.signal?.action || !signal.signal?.confidence || !signal.signal?.reasoning) {
    return false;
  }
  
  if (signal.execution?.hasOrder === undefined) {
    return false;
  }
  
  // 如果有订单，检查订单详情
  if (signal.execution.hasOrder && (!signal.execution.orders || signal.execution.orders.length === 0)) {
    return false;
  }
  
  // 检查每个订单的必要字段
  if (signal.execution.hasOrder) {
    for (const order of signal.execution.orders) {
      if (!order.type || !order.size || !order.priceType || !order.price) {
        return false;
      }
    }
  }
  
  return true;
}

