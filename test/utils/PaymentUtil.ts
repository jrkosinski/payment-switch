import { Addressable, BigNumberish, Signer } from "ethers";
import { ethers } from "hardhat";
import { PaymentSwitchNative, PaymentSwitchToken, TestToken } from "typechain";
import { IPayment } from "./IPayment";

/**
 * Input params for multiple concurrent payments to the switch. 
 */
export interface IMultiPayment {
    receiver: string;
    currency: string; //token address, or ethers.ZeroAddress for native 
    payments: IPayment[];
}

export interface IPaymentInput {
    id: number,
    payer: string,
    amount: number,
    receiver: string, 
    currency: string
}

export class PaymentUtil {
    paymentSwitch: PaymentSwitchNative | PaymentSwitchToken; 
    paymentId: number = 0;
    token: TestToken | null = null;
    
    constructor(
        _paymentSwitch: PaymentSwitchToken | PaymentSwitchNative, 
        _token: TestToken | null = null
    ) {
        this.paymentSwitch = _paymentSwitch;
        this.token = _token;
    }

    //TODO: (HIGH) change this to take account of buyer ,and use buyer account
    async placePayment(
        seller: string | Addressable,
        buyer: Signer,
        amount: number) : Promise<number> {

        if (this.token) {
            await this.token.connect(buyer).approve(this.paymentSwitch.target.toString(), amount);
            await this.paymentSwitch.connect(buyer).placePayment({ 
                receiver: seller.toString(), 
                id: ++this.paymentId, 
                payer: await buyer.getAddress(),
                amount
            }); 
        }
        else {
            await this.paymentSwitch.connect(buyer).placePayment({
                receiver: seller.toString(), 
                id: ++this.paymentId,
                payer: await buyer.getAddress(),
                amount, 
            }, {value:amount}); 
        }
        return this.paymentId;
    }

    //TODO: (HIGH) change this to take account of buyer ,and use byyer account
    async placePayments(
        sellers: string[] | Addressable[],
        buyers: Signer[],
        amounts: number[]
    ): Promise<number[]> {
        const output: number[] = [];
        for (let n = 0; n < sellers.length; n++) {
            output.push(await this.placePayment(sellers[n], buyers[n], amounts[n]));
        }

        return output;
    }

    //TODO: (HIGH) change this to take account of buyer ,and use byyer account
    async addToExistingPayment(
        id: number,
        seller: string | Addressable,
        buyer: Signer,
        amount: number
    ): Promise<void> {
        if (this.token) {
            await this.token.connect(buyer).approve(this.paymentSwitch.target.toString(), amount);
            await this.paymentSwitch.connect(buyer).placePayment({
                receiver: seller.toString(),
                id,
                payer: await buyer.getAddress(),
                amount
            });
        }
        else {
            await this.paymentSwitch.connect(buyer).placePayment({
                receiver: seller.toString(), 
                id,
                payer: await buyer.getAddress(),
                amount
            }, {value:amount});
        }
    }
      
    async getPayment(paymentId: number): Promise<IPayment> {
        const result = await this.paymentSwitch.getPaymentById(paymentId);
        const payment = {
            id: parseInt(result[0]),
            payer: result[1],
            amount: parseInt(result[2]),
            refundAmount: parseInt(result[3]),
            state: parseInt(result[4].toString())
        }
        return payment;
    }

    async getBalance(address: string | Addressable): Promise<number> {
        if (this.token) {
            return parseInt((await this.token.balanceOf(address.toString())).toString());
        }
        else {
            return parseInt((await ethers.provider.getBalance(address)).toString());
        }
    }
    
    organizeMultiplePayments(inputs: IPaymentInput[]): { 
        receivers: string[], payments: IMultiPayment[], tokenApprovals: { [id: string]: number }
    } {
        const receivers: string[] = [];
        const tokenApprovals: { [id: string]: number } = {};
        const payments: IMultiPayment[] = [];
        
        inputs.forEach(i => {
            //record the currency
            if (!tokenApprovals[i.currency])
                tokenApprovals[i.currency] = 0;
            tokenApprovals[i.currency] += i.amount;
            
            //record the receiver & find the multipayment
            let existingMultiPayment: IMultiPayment | undefined = payments.find((p) => p.receiver == i.receiver);
            if (!existingMultiPayment) {
                receivers.push(i.receiver);
                existingMultiPayment = {
                    receiver: i.receiver,
                    currency: i.currency,
                    payments: []
                }; 
            } 
            
            //add the payment 
            existingMultiPayment.payments.push({
                id: i.id, 
                payer: i.payer, 
                amount: i.amount,
                refundAmount: 0, 
                state: 0
            });
        });
        
        return {
            receivers, 
            tokenApprovals, 
            payments
        }; 
    }
}