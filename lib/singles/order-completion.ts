import { awardRewardPoints } from '@/lib/rewards/award'
import {
  REWARD_POINTS,
  calculateBuyerPurchasePoints,
  calculateSellerSalePointsFromSale,
} from '@/lib/rewards/points'
import type { SinglesOrderRow } from '@/lib/singles/orders'

/**
 * Mint the reward points a settled singles order earns: buyer purchase points,
 * the buyer's one-time first-order bonus, and seller sale points. Awards are
 * idempotent at the database level, so a re-run of any completion path — one
 * order, or every order in a mail slot — can never double-pay.
 */
export async function awardSinglesOrderCompletionPoints(
  adminSupabase: any,
  order: Pick<SinglesOrderRow, 'id' | 'buyer_user_id' | 'seller_user_id' | 'discounted_subtotal_usd'>
) {
  const saleValueUsd = Number(order.discounted_subtotal_usd ?? 0)
  const buyerPoints = calculateBuyerPurchasePoints(saleValueUsd)
  const sellerPoints = calculateSellerSalePointsFromSale(saleValueUsd)
  const orderSource = { sourceType: 'singles_order', sourceId: String(order.id) }

  await awardRewardPoints(adminSupabase, {
    userId: order.buyer_user_id,
    amount: buyerPoints,
    reason: 'singles_purchase',
    usdBasis: saleValueUsd,
    ...orderSource,
  })
  const bonusMinted = await awardRewardPoints(adminSupabase, {
    userId: order.buyer_user_id,
    amount: REWARD_POINTS.firstOrderBonus,
    reason: 'first_order_bonus',
    sourceType: 'lifetime',
    sourceId: 'first_completed_order',
  })
  await awardRewardPoints(adminSupabase, {
    userId: order.seller_user_id,
    amount: sellerPoints,
    reason: 'singles_sale',
    usdBasis: saleValueUsd,
    ...orderSource,
  })

  return { buyerPoints, bonusMinted, sellerPoints }
}
