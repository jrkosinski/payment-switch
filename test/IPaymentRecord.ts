import { BigNumberish } from "ethers";

interface IPaymentRecord {
    orderId: BigNumberish, 
    payer: string, 
    amount: BigNumberish, 
    refunded: boolean
}