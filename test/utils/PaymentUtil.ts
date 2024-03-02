import { Addressable } from "ethers";
import { ethers } from "hardhat";
import { PaymentSwitchNative, PaymentSwitchToken, TestToken } from "typechain";
import { IPayment } from "./IPayment";

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
    
    async placePayment(
        seller: string | Addressable,
        buyer: string | Addressable,
        amount: number) : Promise<number> {

        if (this.token) {
            await this.token.approve(this.paymentSwitch.target.toString(), amount);
            await this.paymentSwitch.placePayment(seller.toString(), { 
                id: this.paymentId++, 
                payer: buyer.toString(), 
                amount, refundAmount: 0 
            }); 
        }
        else {
            await this.paymentSwitch.placePayment(seller.toString(), {
                id: this.paymentId++,
                payer: buyer.toString(),
                amount, 
                refundAmount: 0
            }, {value:amount}); 
        }
        return this.paymentId - 1;
    }

    async placePayments(
        sellers: string[] | Addressable[],
        buyers: string[] | Addressable[],
        amounts: number[]
    ): Promise<number[]> {
        const output: number[] = [];
        for (let n = 0; n < sellers.length; n++) {
            output.push(await this.placePayment(sellers[n], buyers[n], amounts[n]));
        }

        return output;
    }
    
    async addToExistingPayment(
        id: number,
        seller: string | Addressable,
        buyer: string | Addressable,
        amount: number
    ): Promise<void> {
        if (this.token) {
            await this.token.approve(this.paymentSwitch.target.toString(), amount);
            await this.paymentSwitch.placePayment(seller.toString(), {
                id,
                payer: buyer.toString(),
                amount,
                refundAmount: 0
            });
        }
        else {
            await this.paymentSwitch.placePayment(seller.toString(), {
                id,
                payer: buyer.toString(),
                amount,
                refundAmount: 0
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
}