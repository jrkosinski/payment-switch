import { BigNumberish } from "ethers";

export interface IPaymentRecord {
    orderId: BigNumberish,
    payer: string,
    amount: BigNumberish,
    refunded: boolean
}