import { BigNumberish } from "ethers";

export interface IPayment {
    id: number,
    payer: string,
    amount: number,
    refundAmount: number, 
    state: number
}